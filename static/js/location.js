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
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

let userName = "";
let userGroup = "";
let userColor = "";
let userIcon;
let isAdmin = false;

while (!userName) {
  userName = prompt("Nome:");
  userGroup = prompt("Grupo:");

  if (userName === "Adm.Barreira") {
    const password = prompt("Password do administrador:");
    if (password === "admin123") {
      isAdmin = true;
      document.getElementById("sidebar").style.display = "block";
    } else {
      alert("Palavra-passe incorreta.");
      userName = "";
    }
  }
}

userColor = getCorGrupo(userGroup);
userIcon = createIcon(userColor);

let showAll = false;
let myMarker = null;
let otherMarkers = [];

function updateMyLocation(position) {
  const { latitude, longitude } = position.coords;

  fetch('/update_location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: `${userName} - ${userGroup}`, lat: latitude, lon: longitude })
  });

  if (myMarker) {
    map.removeLayer(myMarker);
  }

  myMarker = L.marker([latitude, longitude], { icon: userIcon })
    .addTo(map)
    .bindPopup("Tu estás aqui");

  if (!showAll) {
    map.setView([latitude, longitude], 15);
  }
}

function refreshOthers() {
  const userList = document.getElementById("userList");
  userList.innerHTML = "";
  let count = 0;

  if (!showAll) {
    otherMarkers.forEach(marker => map.removeLayer(marker));
    otherMarkers = [];
    document.getElementById("userCount").textContent = 0;
    return;
  }

  fetch('/get_locations')
    .then(res => res.json())
    .then(data => {
      otherMarkers.forEach(marker => map.removeLayer(marker));
      otherMarkers = [];

      const agora = Date.now();

      Object.entries(data).forEach(([user, loc]) => {
        if (user !== `${userName} - ${userGroup}`) {
          const grupo = user.includes(" - ") ? user.split(" - ")[1] : "Geral";
          const cor = getCorGrupo(grupo);
          const icon = createIcon(cor);
          const tempo = Math.floor((agora - loc.timestamp * 1000) / 60000);
          const hora = new Date(loc.timestamp * 1000).toLocaleTimeString();

          const marker = L.marker([loc.lat, loc.lon], { icon }).bindPopup(`${user}<br><small>Última atualização: ${hora}</small>`);
          marker.addTo(map);
          otherMarkers.push(marker);
          count++;

          if (isAdmin) {
            const li = document.createElement("li");
            li.innerHTML = `${user}<br><small>${hora} (${tempo} min)</small> <button onclick="removeUser('${user}')">X</button>`;
            userList.appendChild(li);
          }
        }
      });

      document.getElementById("userCount").textContent = count;
    });
}

document.getElementById("toggleBtn").addEventListener("click", () => {
  showAll = !showAll;
  document.getElementById("toggleBtn").innerText = showAll ? "Ver só eu" : "Ver todos";
  refreshOthers();
});

function removeUser(name) {
  fetch('/remove_user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: name })
  }).then(() => refreshOthers());
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
sairBtn.style.position = "absolute";
sairBtn.style.bottom = "20px";
sairBtn.style.right = "10px";
sairBtn.style.zIndex = "1000";
sairBtn.style.padding = "10px 15px";
sairBtn.style.backgroundColor = "#dc3545";
sairBtn.style.color = "white";
sairBtn.style.border = "none";
sairBtn.style.borderRadius = "8px";
sairBtn.style.cursor = "pointer";
sairBtn.onclick = sair;
document.body.appendChild(sairBtn);

navigator.geolocation.watchPosition(updateMyLocation);
setInterval(refreshOthers, 5000);
