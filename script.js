document.addEventListener("DOMContentLoaded", () => {
  const micBtn = document.getElementById("micBtn");
  const audioUpload = document.getElementById("audioUpload");
  const statusMsg = document.getElementById("statusMsg");
  const recognizedText = document.getElementById("recognizedText");
  const intentOutput = document.getElementById("intentOutput");
  const mqttOutput = document.getElementById("mqttOutput");

  const devices = {
    light: document.getElementById("light"),
    fan: document.getElementById("fan"),
    pump: document.getElementById("pump"),
    thermostat: document.getElementById("thermostat"),
  };

  // ✅ Map similar spoken phrases to consistent device IDs
  const deviceMap = {
    "light": "light",
    "lights": "light",
    "bedroom light": "light",
    "living room light": "light",
    "fan": "fan",
    "ceiling fan": "fan",
    "pump": "pump",
    "water pump": "pump",
    "garden pump": "pump",
    "temperature": "thermostat",
    "thermostat": "thermostat",
  };

  // 🎤 SPEECH RECOGNITION
  let recognition;
  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => (statusMsg.textContent = "🎧 Listening...");
    recognition.onerror = (e) => (statusMsg.textContent = "❌ Error: " + e.error);
    recognition.onend = () => (statusMsg.textContent = "✅ Listening stopped.");
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      recognizedText.textContent = text;
      detectIntent(text);
    };
  } else {
    statusMsg.textContent = "⚠️ Speech recognition not supported in this browser.";
  }

  micBtn.addEventListener("click", () => {
    if (recognition) recognition.start();
  });

  // 📁 FILE UPLOAD (SIMULATED)
  audioUpload.addEventListener("change", () => {
    const fakeTexts = ["turn on fan", "turn off light", "set temperature to 26"];
    const text = fakeTexts[Math.floor(Math.random() * fakeTexts.length)];
    recognizedText.textContent = text + " (simulated)";
    detectIntent(text);
  });

  // 🧠 INTENT DETECTION
  function detectIntent(text) {
    text = text.toLowerCase();
    let parsed;

    if (text.includes("turn on")) {
      parsed = { intent: "turn_on", device: extractDevice(text) };
    } else if (text.includes("turn off")) {
      parsed = { intent: "turn_off", device: extractDevice(text) };
    } else if (text.includes("set") && text.includes("temperature")) {
      const value = text.match(/\d+/)?.[0] || 24;
      parsed = { intent: "set_temperature", value: value };
    } else {
      parsed = { intent: "unknown", raw: text };
    }

    intentOutput.textContent = JSON.stringify(parsed, null, 2);
    simulateMQTT(parsed);
  }

  // 🔍 Extract device name safely
  function extractDevice(text) {
    for (const key in deviceMap) {
      if (text.includes(key)) return deviceMap[key];
    }
    return "unknown";
  }

  // 📡 MQTT + LIVE DEVICE UPDATE
  function simulateMQTT(parsed) {
    let topic, payload;

    if (parsed.intent === "turn_on" || parsed.intent === "turn_off") {
      const device = parsed.device;
      topic = `home/${device}/set`;
      payload = { state: parsed.intent === "turn_on" ? "ON" : "OFF" };
      updateDevice(device, payload.state);
    } else if (parsed.intent === "set_temperature") {
      topic = "home/thermostat/set";
      payload = { temperature: parsed.value };
      updateTemperature(parsed.value);
    } else {
      topic = "home/unknown";
      payload = { message: "unknown command" };
    }

    mqttOutput.textContent = `Topic: ${topic}\nPayload:\n${JSON.stringify(payload, null, 2)}`;
  }

  // 💡 DEVICE DASHBOARD UPDATE
  function updateDevice(device, state) {
    const card = devices[device];
    if (!card) {
      console.warn("Unknown device:", device);
      return;
    }
    const status = card.querySelector(".status");
    if (state === "ON") {
      card.classList.add("device-on");
      status.textContent = "ON";
    } else {
      card.classList.remove("device-on");
      status.textContent = "OFF";
    }
  }

  function updateTemperature(val) {
    const card = devices["thermostat"];
    const status = card.querySelector(".status");
    status.textContent = `${val}°C`;
  }

  // 🌡 LIVE SENSOR DATA SIMULATION
  setInterval(() => {
    const temp = 24 + Math.random() * 4;
    const humidity = 60 + Math.random() * 10;
    addSensorData(temp.toFixed(1), humidity.toFixed(1));
  }, 3000);

  // 📊 LIVE CHART
  const ctx = document.getElementById("sensorChart");
  const data = {
    labels: [],
    datasets: [
      { label: "Temperature (°C)", data: [], borderColor: "#ff9800", fill: false, tension: 0.3 },
      { label: "Humidity (%)", data: [], borderColor: "#00e5ff", fill: false, tension: 0.3 },
    ],
  };

  const chart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      animation: false,
      scales: { y: { beginAtZero: true }, x: { ticks: { display: false } } },
    },
  });

  function addSensorData(temp, hum) {
    const now = new Date().toLocaleTimeString();
    if (data.labels.length > 10) {
      data.labels.shift();
      data.datasets[0].data.shift();
      data.datasets[1].data.shift();
    }
    data.labels.push(now);
    data.datasets[0].data.push(temp);
    data.datasets[1].data.push(hum);
    chart.update();
  }
});
