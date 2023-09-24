import json
import os
from unittest.mock import patch
from .. import engine

@patch("jupyterlab_sql_explorer.handlers.engine._getDbInfo")
async def test_sqlite_dbtable(mock_dbinfo, jp_fetch):
    os.system('rm /tmp/jp_sql_tmp.db')
    mock_dbinfo.return_value={'db_id': 'testdb', 'db_type': engine.DB_SQLITE, 'db_name': 'jp_sql_tmp.db'}

    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': 'testdb'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"data": []}

    response = await jp_fetch("jupyterlab-sql-explorer", "query",
                              method='POST',
                              body=json.dumps({'dbid': 'testdb', 'sql': 'create table AAA (a int, b int)'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload['error'] == 'RETRY'

    response = await jp_fetch("jupyterlab-sql-explorer", "query", params={'taskid': payload['data']})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': {}}

    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': 'testdb'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"data": [{'name': 'AAA', 'desc': '', 'type': 'table'}]}
    
    response = await jp_fetch("jupyterlab-sql-explorer", "columns", params={'dbid': 'testdb', 'db': '', 'tbl': 'AAA'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': [{'name': 'a', 'desc': 'INT', 'type': 'col'}, {'name': 'b', 'desc': 'INT', 'type': 'col'}]}