import json
import traceback
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
from . import engine, db
from . import task

class ConnHandler(APIHandler):
    '''
    data source connection handler
    '''
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({'data': engine.getDBlist()}))

    @tornado.web.authenticated
    def post(self):
        try:
            data = self.get_json_body()
            engine.addEntry(data)
            self.finish(json.dumps({'data': engine.getDBlist()}))
        except Exception as err:
            self.log.error(err)
            traceback.print_exc()
            self.finish(json.dumps({'error': str(err)}))

    @tornado.web.authenticated
    def put(self):
        try:
            data = self.get_json_body()
            engine.addEntry(data)
            self.finish(json.dumps({'data': engine.getDBlist()}))
        except Exception as err:
            self.log.error(err)
            traceback.print_exc()
            self.finish(json.dumps({'error': str(err)}))

    @tornado.web.authenticated
    def delete(self):
        dbid=self.get_argument('dbid')
        engine.delEntry(dbid)
        self.finish(json.dumps({'data': engine.getDBlist()}))

class DbTableHandler(APIHandler):
    '''
     Obtain the database or table (if there is no database layer) of a specified database 
     connection
    '''
    @tornado.web.authenticated
    def get(self):
        dbid=self.get_argument('dbid')
        database = self.get_argument('db', None)
        try:
            st, db_user=engine.check_pass(dbid)
            if not st:
                self.finish(json.dumps({'error': 'NEED-PASS', 'pass_info': {'db_id': dbid, 'db_user': db_user}}))
            else:
                data=db.get_db_or_table(dbid, database)
                self.finish(json.dumps({'data': data}))
        except Exception as err:
            self.log.error(err)
            traceback.print_exc()
            self.finish(json.dumps({'error': "can't get db/table list of "+dbid}))

class TabColumnHandler(APIHandler):
    '''
    Retrieve the schema of a database table.
    '''
    @tornado.web.authenticated
    def get(self):
        dbid = self.get_argument('dbid')
        database = self.get_argument('db', None)
        tbl = self.get_argument('tbl')
        try:
            st, db_user=engine.check_pass(dbid)
            if not st:
                self.finish(json.dumps({'error': 'NEED-PASS', 'pass_info': {'db_id': dbid, 'db_user': db_user}}))
            else:
                data=db.get_column_info(dbid, database, tbl)
                self.finish(json.dumps({'data': data}))
        except Exception as err:
            self.log.error(err)
            traceback.print_exc()
            self.finish(json.dumps({'error': f"can't get table columns of {tbl}, reason: {str(err)}"}))

class PasswdHandler(APIHandler):
    '''
    Retrieve the schema of a database table.
    '''
    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        try:
            st, msg=engine.set_pass(data['db_id'], data['db_user'], data['db_pass'])
            if st:
                self.finish(json.dumps({'data': 'set passwd ok'}))
            else:
                self.finish(json.dumps({'error': msg}))
        except Exception as err:
            self.log.error(err)
            self.finish(json.dumps({'error': "set passwd error : " + data['db_id']}))
    '''
    Clear temporary stored password
    '''
    @tornado.web.authenticated
    def delete(self):
        dbid=self.get_argument('dbid', None)
        engine.clear_pass(dbid)
        self.finish(json.dumps({'data': 'delete pass ok'}))

class QueryHandler(APIHandler):
    '''
    create/get/del query task
    The query may take a long time to run, so we have implemented long polling.
    For queries that have a runtime longer than 120 seconds, the response will be 'RETRY,' and the client will use GET to wait.
    '''
    @tornado.web.authenticated
    async def post(self):
        qdata = self.get_json_body()
        try:
            st, db_user=engine.check_pass(qdata['dbid'])
            if not st:
                self.finish(json.dumps({'error': 'NEED-PASS', 'pass_info': {'db_id': qdata['dbid'], 'db_user': db_user}}))
            else:
                taskid = await task.create_query_task(db.query_header, qdata['dbid'], qdata['sql'])
                self.finish(json.dumps({'error': 'RETRY', 'data': taskid}))
        except Exception as err:
            self.log.error(err)
            self.finish(json.dumps({'error': str(err)}))

    '''
    get status of query
    '''
    @tornado.web.authenticated
    async def get(self):
        task_id=self.get_argument('taskid')
        try:
            rc, data = await task.get_result(task_id)
            if rc:
                self.finish(json.dumps({'data': data}))
            else:
                self.finish(json.dumps(data))
        except Exception as err:
            self.log.error(err)
            self.finish(json.dumps({'error': str(err)}))
    '''
    canel query
    '''
    @tornado.web.authenticated
    async def delete(self):
        task_id=self.get_argument('taskid')
        try:
            await task.delete(task_id)
            self.finish(json.dumps({}))
        except Exception as err:
            self.log.error(err)
            self.finish(json.dumps({'error': str(err)}))

def handler_url(base_url, act):
    return url_path_join(base_url, "jupyterlab-sql-explorer", act)

def setup_handlers(web_app):
    host_pattern=".*$"

    base_url=web_app.settings["base_url"]
    handlers=[
        (handler_url(base_url, "conns"), ConnHandler),
        (handler_url(base_url, "dbtables"), DbTableHandler),
        (handler_url(base_url, "columns"), TabColumnHandler),
        (handler_url(base_url, "pass"), PasswdHandler),
        (handler_url(base_url, "query"), QueryHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
