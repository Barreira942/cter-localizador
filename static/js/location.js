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
      if (!data.success) {
        alert("Credenciais inválidas.");
        return;
      }

      if (data.admin) {
        isAdmin = true;
        document.getElementById("sidebar").style.display = "block";
        document.getElementById("adminFilter").style.display = "block";
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
  // continua com as funções anteriores de atualização...
}
