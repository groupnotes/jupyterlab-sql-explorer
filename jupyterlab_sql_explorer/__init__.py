from traitlets import Unicode, default
from traitlets.config import Configurable
import os

from ._version import __version__
from .handlers import setup_handlers
from . import db
from . import comments
from .const import DB_ROOT

class JupyterLabSqlExplorer(Configurable):
    """
    Config options for jupyterlab_sql_explorer
    """
    comments_store = Unicode(
        help="how to store comments",
        config=True
    )

    @default('comments_store')
    def _comments_store(self):
        p = os.path.expanduser(DB_ROOT+ 'comments.db')
        dir_name = os.path.dirname(p)
        os.makedirs(dir_name, exist_ok=True)
        return "database::sqlite:///" + p

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jupyterlab-sql-explorer"
    }]

def _jupyter_server_extension_points():
    return [{
        "module": "jupyterlab_sql_explorer"
    }]

def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    cfg = JupyterLabSqlExplorer(config=server_app.config)
    server_app.log.info("use comment store: " + cfg.comments_store)
    comments.init(cfg.comments_store)

    setup_handlers(server_app.web_app)
    name = "jupyterlab_sql_explorer"
    server_app.log.info(f"Registered {name} server extension")


# For backward compatibility with notebook server - useful for Binder/JupyterHub
load_jupyter_server_extension = _load_jupyter_server_extension

