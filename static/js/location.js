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
let userIcon;
let isAdmin = false;
let myMarker = null;
let otherMarkers = [];

function iniciarApp() {
  userName = prompt("Nome:");
  const grupoEl = document.getElementById("grupo");
  userGroup = grupoEl.value;

  const adminUsers = ["Adm.Barreira", "Adm.Rato", "NAIIC"];
  if (adminUsers.includes(userName)) {
    const password = prompt("Password do administrador:");
    if (password === "admin123") {
      isAdmin = true;
      document.getElementById("sidebar").style.display = "block";
      document.getElementById("adminFilter").style.display = "block";
    } else {
      alert("Password incorreta.");
      return;
    }
  }

  document.getElementById("grupoSelect").style.display = "none";
  const cor = getCorGrupo(userGroup);
  userIcon = createIcon(cor);

  navigator.geolocation.watchPosition(updateMyLocation);
  setInterval(refreshOthers, 5000);
}

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

  if (!window._jaFezZoomInicial) {
    map.setView([latitude, longitude], 15);
    window._jaFezZoomInicial = true;
  }

  if (!trilhos[userName]) trilhos[userName] = [];
  trilhos[userName].push([latitude, longitude]);

  desenharTrilho(userName);
}

function desenharTrilho(user) {
  if (!mostrarTrilho[user] || !trilhos[user]) return;

  if (linhas[user]) map.removeLayer(linhas[user]);

  const cor = getCorGrupo(user.split(" - ")[1] || "Geral");
  linhas[user] = L.polyline(trilhos[user], { color: cor }).addTo(map);
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

      Object.entries(data).forEach(([user, loc]) => {
        if (user === `${userName} - ${userGroup}`) return;

        const grupo = user.split(" - ")[1] || "Geral";
        const cor = getCorGrupo(grupo);
        const icon = createIcon(cor);
        const hora = new Date(loc.timestamp * 1000).toLocaleTimeString();

        const visivel = isAdmin || loc.public || grupo === userGroup;

        if (visivel) {
          const marker = L.marker([loc.lat, loc.lon], { icon }).bindPopup(`${user}<br><small>${hora}</small>`);
          marker.addTo(map);
          otherMarkers.push(marker);

          if (!trilhos[user]) trilhos[user] = [];
          trilhos[user].push([loc.lat, loc.lon]);

          if (mostrarTrilho[user]) desenharTrilho(user);

          if (isAdmin) {
            const li = document.createElement("li");
            li.innerHTML = `${user}<br><small>${hora}</small>`;
            userList.appendChild(li);

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = loc.public;
            cb.onchange = () => {
              fetch('/set_visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, public: cb.checked })
              });
            };
            const label = document.createElement("label");
            label.appendChild(cb);
            label.appendChild(document.createTextNode(" " + user));
            checkboxList.appendChild(label);
            checkboxList.appendChild(document.createElement("br"));

            const cb2 = document.createElement("input");
            cb2.type = "checkbox";
            cb2.checked = mostrarTrilho[user] || false;
            cb2.onchange = () => {
              mostrarTrilho[user] = cb2.checked;
              desenharTrilho(user);
            };
            const label2 = document.createElement("label");
            label2.appendChild(cb2);
            label2.appendChild(document.createTextNode(" Ver rastro de " + user));
            trailList.appendChild(label2);
            trailList.appendChild(document.createElement("br"));
          }
        }
      });

      document.getElementById("userCount").textContent = otherMarkers.length;
    });
}
