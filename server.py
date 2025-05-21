from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
import os

class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Check if the path is a file or directory
        if not os.path.exists(self.translate_path(self.path)) or os.path.isdir(self.translate_path(self.path)):
            self.path = '/index.html'
        return super().do_GET()

if __name__ == '__main__':
    TCPServer(('', 8000), SPAHandler).serve_forever()