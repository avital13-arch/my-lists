import os
import webview
from api import Api

if __name__ == '__main__':
    api      = Api()
    here     = os.path.dirname(os.path.abspath(__file__))
    html     = os.path.join(here, 'index.html')

    webview.create_window(
        'My Lists',
        url=html,
        js_api=api,
        width=1040,
        height=860,
        min_size=(640, 520),
    )
    webview.start()
