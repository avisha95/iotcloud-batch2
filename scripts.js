// Konfigurasi MQTT
const brokerUrl = 'ws://broker.emqx.io:8083/mqtt';
const topicSuhu = "tes/1892121/topic/suhu";
const topicKelembaban = "tes/1892121/topic/kelembaban";
const topicLampu = "tes/1892121/topic/lampu";

// Opsi koneksi MQTT
const options = {
    keepalive: 60,
    clientId: 'web_' + Math.random().toString(16).substr(2, 8),
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
};

// Inisialisasi client MQTT (menggunakan library mqtt.min.js)
const client = mqtt.connect(brokerUrl, options);

// Event ketika terhubung
client.on('connect', () => {
    console.log('✅ Terhubung ke MQTT Broker');
    
    // Subscribe ke topik yang diperlukan
    client.subscribe(topicSuhu, { qos: 1 });
    client.subscribe(topicKelembaban, { qos: 1 });
    client.subscribe(topicLampu, { qos: 1 });
    
    console.log(`Subscribed to: ${topicSuhu}, ${topicKelembaban}, ${topicLampu}`);
});

// Event ketika menerima pesan
client.on('message', (topic, message) => {
    const msgStr = message.toString();
    console.log(`📩 Topic: ${topic} | Message: ${msgStr}`);
    
    if (topic === topicSuhu) {
        const tempValue = parseFloat(msgStr);
        if (!isNaN(tempValue)) {
            window.updateSuhu(tempValue);
        } else {
            window.updateSuhu(msgStr);
        }
    }
    
    if (topic === topicKelembaban) {
        const humValue = parseFloat(msgStr);
        if (!isNaN(humValue)) {
            window.updateKelembaban(humValue);
        } else {
            window.updateKelembaban(msgStr);
        }
    }
    
    if (topic === topicLampu) {
        window.updateLamp(msgStr === '1');
    }
});

// Event ketika koneksi error
client.on('error', (err) => {
    console.error('❌ MQTT Error:', err);
});

// Event ketika terputus
client.on('close', () => {
    console.warn('⚠️ Koneksi MQTT terputus, mencoba menyambung kembali...');
});

// Fungsi publish untuk kontrol lampu
window.publish_led = function(message) {
    window.updateLamp(message === '1');
    client.publish(topicLampu, message, { qos: 1, retain: true }, (err) => {
        if (err) {
            console.error('❌ Gagal publish pesan:', err);
        } else {
            console.log(`✅ Published ${message} to ${topicLampu}`);
        }
    });
};

// PERBAIKAN: Override fungsi updateKelembaban yang sudah ada di HTML
// Agar jarum gauge bergerak dengan benar
const originalUpdateKelembaban = window.updateKelembaban;
window.updateKelembaban = function(val) {
    const el = document.getElementById('kelembaban');
    const arc = document.getElementById('humidArc');
    const needle = document.getElementById('humidNeedle');
    const bar = document.getElementById('humidBar');
    const pill = document.getElementById('humid-pill');

    const num = parseFloat(val);
    if (isNaN(num)) {
        if (el) el.textContent = val;
        return;
    }

    // Tampilkan nilai dengan simbol %
    if (el) el.textContent = num + '%';

    const pct = Math.min(100, Math.max(0, num));
    
    // Perbaikan arc (stroke-dashoffset)
    if (arc) {
        const offset = 166 - (pct / 100) * 166;
        arc.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }
    
    // PERBAIKAN JARUM GAUGE
    // Sudut: 180° (kiri) untuk 0%, 90° (bawah) untuk 50%, 0° (kanan) untuk 100%
    const angleDeg = 180 - (pct / 70) * 180;
    const rad = angleDeg * Math.PI / 180;
    const radius = 42; // Panjang jarum
    const centerX = 65, centerY = 65;
    const x2 = centerX + radius * Math.cos(rad);
    const y2 = centerY + radius * Math.sin(rad);
    
    if (needle) {
        needle.setAttribute('x2', x2.toFixed(1));
        needle.setAttribute('y2', y2.toFixed(1));
    }
    
    // Progress bar horizontal
    if (bar) bar.style.width = pct + '%';

    // Update pill status
    if (pill) {
        if (num >= 80) {
            pill.className = 'pill pill-warning';
            pill.textContent = 'Tinggi';
        } else if (num <= 20) {
            pill.className = 'pill pill-warning';
            pill.textContent = 'Rendah';
        } else {
            pill.className = 'pill pill-normal';
            pill.textContent = 'Normal';
        }
    }
};

// Juga perbaiki updateSuhu agar konsisten (tambahkan °C)
const originalUpdateSuhu = window.updateSuhu;
window.updateSuhu = function(val) {
    const el = document.getElementById('suhu');
    const fill = document.getElementById('thermoFill');
    const pill = document.getElementById('suhu-pill');

    const num = parseFloat(val);
    if (isNaN(num)) {
        if (el) el.textContent = val;
        return;
    }

    if (el) el.textContent = num + '°C';

    const pct = Math.min(100, Math.max(0, num));
    if (fill) fill.style.height = pct + '%';

    if (pill) {
        if (num >= 70) {
            pill.className = 'pill pill-critical';
            pill.textContent = 'Critical';
        } else if (num >= 55) {
            pill.className = 'pill pill-warning';
            pill.textContent = 'Warning';
        } else {
            pill.className = 'pill pill-normal';
            pill.textContent = 'Normal';
        }
    }
};