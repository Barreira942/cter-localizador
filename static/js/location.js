let map = L.map('map').setView([38.72, -9.14], 13);

// Mapas base
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

// Cores
const coresDisponiveis = ["red", "blue", "green", "orange", "violet", "gold", "black", "grey"];
const coresPorGrupo = {};

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

// Login
let userName = "", userGroup = "", isAdmin = false;
const gruposDisponiveis = ["Alfa", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];

while (!userName) {
  userName = prompt("Nome:");
  if (userName === "NAIIC") {
    const password = prompt("Password do administrador:");
    if (password === "admin123") {
      isAdmin = true;
      document.getElementById("sidebar").style.display = "block";
      document.getElementById("adminFilter").style.display = "block";
    } else {
      alert("Password incorreta.");
      userName = "";
    }
  }
}

while (!userGroup) {
  const grupoSelecionado = prompt("Escolhe o teu grupo:\n" + gruposDisponiveis.join(", "));
  if (gruposDisponiveis.includes(grupoSelecionado)) {
    userGroup = grupoSelecionado;
  } else {
    alert("Grupo inválido.");
  }
}

const userColor = getCorGrupo(userGroup);
const userIcon = createIcon(userColor);

let myMarker = null;
let otherMarkers = [];

function updateMyLocation(position) {
  const { latitude, longitude } = position.coords;
  fetch('/update_location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: `${userName} - ${userGroup}`, lat: latitude, lon: longitude })
  });

  if (myMarker) map.removeLayer(myMarker);
  myMarker = L.marker([latitude, longitude], { icon: userIcon })
    .addTo(map).bindPopup("Tu estás aqui");
}

function refreshOthers() {
  fetch('/get_locations')
    .then(res => res.json())
    .then(data => {
      otherMarkers.forEach(marker => map.removeLayer(marker));
      otherMarkers = [];

      const agora = Date.now();
      const userList = document.getElementById("userList");
      const checkboxList = document.getElementById("checkboxList");

      if (isAdmin) {
        userList.innerHTML = "";
        checkboxList.innerHTML = "";
      }

      Object.entries(data).forEach(([user, loc]) => {
        const grupo = user.includes(" - ") ? user.split(" - ")[1] : "Geral";
        const cor = getCorGrupo(grupo);
        const icon = createIcon(cor);
        const tempo = Math.floor((agora - loc.timestamp * 1000) / 60000);
        const hora = new Date(loc.timestamp * 1000).toLocaleTimeString();
        const visivelParaTodos = loc.public === true;
        const doMesmoGrupo = grupo === userGroup;
        const mostrar = isAdmin || visivelParaTodos || doMesmoGrupo;

        if (user !== `${userName} - ${userGroup}` && mostrar) {
          const marker = L.marker([loc.lat, loc.lon], { icon }).bindPopup(`${user}<br><small>${hora}</small>`);
          marker.addTo(map);
          otherMarkers.push(marker);

          if (isAdmin) {
            const li = document.createElement("li");
            li.innerHTML = `${user}<br><small>${hora} (${tempo} min)</small> <button onclick="removeUser('${user}')">❌</button>`;
            userList.appendChild(li);

            const div = document.createElement("div");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = visivelParaTodos;
            checkbox.onchange = () => {
              fetch('/set_visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, public: checkbox.checked })
              });
            };
            div.appendChild(checkbox);
            div.appendChild(document.createTextNode(" " + user));
            checkboxList.appendChild(div);
          }
        }
      });

      document.getElementById("userCount").textContent = otherMarkers.length;
    });
}

function removeUser(name) {
  if (confirm(`Tens a certeza que queres remover ${name}?`)) {
    fetch('/remove_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: name })
    }).then(() => refreshOthers());
  }
}

function sair() {
  fetch('/remove_user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: `${userName} - ${userGroup}` })
  }).then(() => {
    alert("Removido com sucesso. Fecha a página.");
    location.reload();
  });
}

const sairBtn = document.createElement("button");
sairBtn.textContent = "Sair";
sairBtn.style = "position:absolute; bottom:20px; right:10px; z-index:1000; padding:10px 15px; background-color:#dc3545; color:white; border:none; border-radius:8px; cursor:pointer;";
sairBtn.onclick = sair;
document.body.appendChild(sairBtn);

navigator.geolocation.watchPosition(updateMyLocation);
setInterval(refreshOthers, 5000);
