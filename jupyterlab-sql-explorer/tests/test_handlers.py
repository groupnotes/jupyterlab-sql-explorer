import pytest
import json
from unittest.mock import patch
from jupyter_sql_explorer import db

async def test_conn(jp_fetch):
    '''
    test for create/del connetion for database
    '''
    response = await jp_fetch("jupyterlab-sql-explorer", "conns")
    assert response.code == 200
    old = json.loads(response.body)

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add", "db_name":"/tmp/test.db", "db_type":'6'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": old['data'] + [{'name': 'add', 'desc': '', 'type': 'conn'}]
    }

    response = await jp_fetch("jupyterlab-sql-explorer", "conns")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": old['data'] + [{'name': 'add', 'desc': '', 'type': 'conn'}]
    }

    response = await jp_fetch("jupyterlab-sql-explorer", "conns", method='DELETE', params={'dbid':'add'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == old

async def test_passwd(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "columns", params={'dbid': 'mysql_nopass', 'db': 'mysql', 'tbl': 'columns_priv'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'NEED-PASS', 'pass_info': {'db_id': 'mysql_nopass', 'db_user': ''}}

    response = await jp_fetch("jupyterlab-sql-explorer", "pass",
                              method='POST',
                              body=json.dumps({'db_id': 'mysql_nopass', 'db_user': 'root', 'db_pass': '123456'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'user or passwd error'}

    response = await jp_fetch("jupyterlab-sql-explorer", "pass",
                              method='POST',
                              body=json.dumps({'db_id': 'mysql_nopass', 'db_user': 'root', 'db_pass': '12345'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': 'set passwd ok'}

    response = await jp_fetch("jupyterlab-sql-explorer", "pass", method='DELETE')

@patch("jupyterlab_git.handlers.GitAllHistoryHandler.db", spec=db)
async def test_mock(mock_db, jp_fetch):
    print(mock_db)
