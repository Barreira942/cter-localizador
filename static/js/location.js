// location.js completo com agrupamento por equipa, rastos funcionais e atualização de pedidos pendentes

let map = L.map('map').setView([38.72, -9.14], 13);

const mapasBase = {
  "Mapa padrão": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }),
  "Satélite (Esri)": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  }),
  "Topográfico (OpenTopoMap)": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: © OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  })
};

mapasBase["Mapa padrão"].addTo(map);
L.control.layers(mapasBase).addTo(map);

const coresDisponiveis = ["red", "blue", "green", "orange", "violet", "gold", "black", "grey"];
const coresPorGrupo = {};
const trilhos = {};
const linhas = {};
const mostrarTrilho = {};

function getCorGrupo(grupo) {
  if (!coresPorGrupo[grupo]) {
    const cor = coresDisponiveis[Object.keys(coresPorGrupo).length % coresDisponiveis.length];
    coresPorGrupo[grupo] = cor;
  }
  return coresPorGrupo[grupo];
}

function createIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  });
}

let userName = "";
let userGroup = "";
let userFullName = "";
let userIcon;
let isAdmin = false;
let myMarker = null;
let otherMarkers = [];

function iniciarApp() {
  userName = document.getElementById("nome").value.trim();
  userGroup = document.getElementById("grupo").value;
  const password = document.getElementById("pass").value;
  userFullName = `${userName} - ${userGroup}`;

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: userName, password: password })
  }).then(res => res.json())
    .then(data => {
      if (data.success) {
        if (data.admin) {
          isAdmin = true;
          document.getElementById("sidebar").style.display = "block";
          document.getElementById("adminFilter").style.display = "block";
          mostrarPainelPendentes();
          setInterval(mostrarPainelPendentes, 10000);
        }

        document.getElementById("loginBox").style.display = "none";
        const cor = getCorGrupo(userGroup);
        userIcon = createIcon(cor);

        const sairBtn = document.createElement("button");
        sairBtn.textContent = "Sair";
        sairBtn.style = "position:absolute; bottom:20px; right:10px; z-index:1000; padding:10px 15px; background-color:#dc3545; color:white; border:none; border-radius:8px; cursor:pointer;";
        sairBtn.onclick = sair;
        document.body.appendChild(sairBtn);

        navigator.geolocation.getCurrentPosition(updateMyLocation, null, {
          enableHighAccuracy: true, maximumAge: 0, timeout: 10000
        });

        navigator.geolocation.watchPosition(updateMyLocation, null, {
          enableHighAccuracy: true, maximumAge: 0, timeout: 10000
        });

        setInterval(refreshOthers, 5000);

      } else if (data.pending) {
        alert("O teu pedido de acesso foi enviado. Aguarda aprovação de um administrador.");
      } else {
        alert("Credenciais inválidas.");
      }
    });
}

function sair() {
  fetch('/remove_user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: userFullName })
  }).then(() => {
    alert("Partilha terminada. Podes fechar a página.");
    location.reload();
  });
}

function updateMyLocation(position) {
  const { latitude, longitude } = position.coords;

  fetch('/update_location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: userFullName, lat: latitude, lon: longitude })
  });

  if (myMarker) map.removeLayer(myMarker);

  myMarker = L.marker([latitude, longitude], { icon: userIcon })
    .addTo(map).bindPopup("Tu estás aqui");

  if (!window._jaFezZoomInicial) {
    map.setView([latitude, longitude], 15);
    window._jaFezZoomInicial = true;
  }

  if (!trilhos[userFullName]) trilhos[userFullName] = [];
  trilhos[userFullName].push([latitude, longitude]);
}

function refreshOthers() {
  fetch('/get_locations')
    .then(res => res.json())
    .then(data => {
      otherMarkers.forEach(marker => map.removeLayer(marker));
      otherMarkers = [];

      const userList = document.getElementById("userList");
      const checkboxList = document.getElementById("checkboxList");
      const trailList = document.getElementById("trailList");

      if (isAdmin) {
        userList.innerHTML = "";
        checkboxList.innerHTML = "";
        trailList.innerHTML = "";
      }

      const grupos = {};

      Object.entries(data).forEach(([user, loc]) => {
        if (user === userFullName) return;

        const grupo = user.split(" - ")[1] || "Geral";
        const cor = getCorGrupo(grupo);
        const icon = createIcon(cor);
        const hora = new Date(loc.timestamp * 1000).toLocaleTimeString();
        const visivel = isAdmin || loc.public || grupo === userGroup;

        if (!grupos[grupo]) grupos[grupo] = [];
        grupos[grupo].push(user);

        if (!trilhos[user]) trilhos[user] = [];
        trilhos[user].push([loc.lat, loc.lon]);

        if (mostrarTrilho[user]) {
          if (linhas[user]) map.removeLayer(linhas[user]);
          linhas[user] = L.polyline(trilhos[user], { color: cor }).addTo(map);
        }

        if (visivel) {
          const marker = L.marker([loc.lat, loc.lon], { icon }).bindPopup(`${user}<br><small>${hora}</small>`);
          marker.addTo(map);
          otherMarkers.push(marker);
        }

        if (isAdmin) {
          const li = document.createElement("li");
          li.textContent = user;

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = loc.public;
          cb.onchange = () => {
            fetch("/set_visibility", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user, public: cb.checked })
            });
          };
          li.prepend(cb);

          const btn = document.createElement("button");
          btn.textContent = "❌";
          btn.onclick = () => {
            fetch("/remove_user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user })
            }).then(refreshOthers);
          };
          li.appendChild(btn);

          checkboxList.appendChild(li);

          const cbTrilho = document.createElement("input");
          cbTrilho.type = "checkbox";
          cbTrilho.checked = !!mostrarTrilho[user];
          cbTrilho.onchange = () => {
            mostrarTrilho[user] = cbTrilho.checked;
            refreshOthers();
          };
          trailList.appendChild(cbTrilho);
          trailList.append(user + " ");
          trailList.appendChild(document.createElement("br"));
        }
      });

      if (isAdmin) {
        Object.entries(grupos).forEach(([grupo, users]) => {
          const grupoTitulo = document.createElement("strong");
          grupoTitulo.textContent = `Equipa: ${grupo}`;
          userList.appendChild(grupoTitulo);
          userList.appendChild(document.createElement("br"));
          users.forEach(user => {
            const li = document.createElement("li");
            li.textContent = user;
            userList.appendChild(li);
          });
        });
      }

      document.getElementById("userCount").textContent = otherMarkers.length;
    });
}

function mostrarPainelPendentes() {
  fetch('/get_pending_users')
    .then(res => res.json())
    .then(users => {
      const anterior = document.getElementById("painelPendentes");
      if (anterior) anterior.remove();

      if (users.length === 0) return;

      const painel = document.createElement("div");
      painel.id = "painelPendentes";
      painel.style = "position:absolute; top:60px; left:10px; background:white; padding:10px; border-radius:8px; z-index:1000; box-shadow:0 0 10px rgba(0,0,0,0.2);";
      painel.innerHTML = "<strong>Pedidos pendentes:</strong><br>";

      users.forEach(user => {
        const linha = document.createElement("div");
        linha.textContent = user + " ";

        const btnOk = document.createElement("button");
        btnOk.textContent = "✅";
        btnOk.onclick = () => {
          fetch('/approve_user', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user })
          }).then(() => {
            alert("Utilizador aprovado!");
            painel.remove();
            mostrarPainelPendentes();
          });
        };

        const btnNo = document.createElement("button");
        btnNo.textContent = "❌";
        btnNo.onclick = () => {
          fetch('/reject_user', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user })
          }).then(() => {
            alert("Utilizador rejeitado.");
            painel.remove();
            mostrarPainelPendentes();
          });
        };

        linha.appendChild(btnOk);
        linha.appendChild(btnNo);
        painel.appendChild(linha);
      });

      document.body.appendChild(painel);
    });
}
