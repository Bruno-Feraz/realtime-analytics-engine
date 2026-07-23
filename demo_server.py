"""
Real-time Analytics Engine - Demo Semplificata
Server Python che simula analytics real-time senza database
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import time
from datetime import datetime
import random
from collections import defaultdict
from threading import Thread

# Storage in-memory per eventi
events_storage = []
metrics_cache = defaultdict(int)

class AnalyticsHandler(BaseHTTPRequestHandler):
    
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "message": "Real-time Analytics Engine",
                "version": "1.0.0",
                "endpoints": ["/health", "/api/events", "/api/metrics", "/api/realtime"]
            }
            self.wfile.write(json.dumps(response).encode())
        
        elif self.path == '/health':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode())
        
        elif self.path == '/api/events':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Ultimi 50 eventi
            recent_events = events_storage[-50:] if events_storage else []
            self.wfile.write(json.dumps({
                "events": recent_events,
                "total": len(events_storage)
            }).encode())
        
        elif self.path == '/api/metrics':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Calcola metriche
            now = time.time()
            last_5min = [e for e in events_storage if now - e['timestamp'] < 300]
            
            metrics = {
                "total_events": len(events_storage),
                "last_5min": len(last_5min),
                "events_per_second": len(last_5min) / 300 if last_5min else 0,
                "by_type": dict(metrics_cache),
                "active_now": len([e for e in events_storage if now - e['timestamp'] < 60])
            }
            self.wfile.write(json.dumps(metrics).encode())
        
        elif self.path == '/api/realtime':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            # Dati real-time ultimi 60 secondi
            now = time.time()
            recent = [e for e in events_storage if now - e['timestamp'] < 60]
            
            # Raggruppa per secondo
            by_second = defaultdict(int)
            for event in recent:
                second = int(event['timestamp'])
                by_second[second] += 1
            
            timeseries = [
                {"time": k, "count": v}
                for k, v in sorted(by_second.items())[-60:]
            ]
            
            self.wfile.write(json.dumps({
                "timeseries": timeseries,
                "total": len(recent)
            }).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/ingest':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode())
                event_type = data.get('event_type', 'unknown')
                
                event = {
                    "timestamp": time.time(),
                    "event_type": event_type,
                    "user_id": data.get('user_id'),
                    "value": data.get('value', 1)
                }
                
                events_storage.append(event)
                metrics_cache[event_type] += 1
                
                # Limita storage a ultimi 10000 eventi
                if len(events_storage) > 10000:
                    events_storage.pop(0)
                
                self.send_response(201)
                self._send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
            
            except Exception as e:
                self.send_response(400)
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Silenzia log HTTP
        return


def generate_fake_events():
    """Genera eventi fake per simulazione"""
    event_types = ['pageview', 'click', 'purchase', 'signup', 'error']
    
    while True:
        # Genera 1-5 eventi ogni secondo
        for _ in range(random.randint(1, 5)):
            event = {
                "timestamp": time.time(),
                "event_type": random.choice(event_types),
                "user_id": f"user_{random.randint(1, 100)}",
                "value": random.randint(1, 100)
            }
            events_storage.append(event)
            metrics_cache[event['event_type']] += 1
        
        # Limita storage
        if len(events_storage) > 10000:
            events_storage[:] = events_storage[-10000:]
        
        time.sleep(1)


def run(port=9000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, AnalyticsHandler)
    
    print(f"""
╔════════════════════════════════════════════════════════╗
║   ⚡ Real-time Analytics Engine - Demo Running        ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║   🌐 Server: http://localhost:{port}                   ║
║   📊 Health: http://localhost:{port}/health            ║
║   📈 Metrics: http://localhost:{port}/api/metrics      ║
║                                                        ║
║   ✨ Generando eventi simulati automaticamente...     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    """)
    
    # Avvia generatore eventi in background
    generator_thread = Thread(target=generate_fake_events, daemon=True)
    generator_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")
        httpd.shutdown()


if __name__ == '__main__':
    run(port=9000)
