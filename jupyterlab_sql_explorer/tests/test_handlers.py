import json
from unittest.mock import patch
from .. import engine

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
        "data": old['data'] + [{'name': 'add', 'desc': '', 'type': 'conn', 'subtype': 6}]
    }

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add2", "db_name":":memory:", "db_type":'6'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": old['data'] + [
            {'name': 'add', 'desc': '', 'type': 'conn', 'subtype': 6},
            {'name': 'add2', 'desc': '', 'type': 'conn', 'subtype': 6}
        ]
    }

    response = await jp_fetch("jupyterlab-sql-explorer", "conns")
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": old['data'] + [
            {'name': 'add', 'desc': '', 'type': 'conn', 'subtype': 6},
            {'name': 'add2', 'desc': '', 'type': 'conn', 'subtype': 6}
        ]
    }

    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': 'add'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': []}

    response = await jp_fetch("jupyterlab-sql-explorer", "conns", method='DELETE', params={'dbid': 'add'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"data": old['data'] + [{'name': 'add2', 'desc': '', 'type': 'conn', 'subtype': 6}]}

async def test_err_conn(jp_fetch):
    '''
    test for create/del connetion for database
    '''
    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add"}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'must set db type.'}

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add", "db_name":"/tmp/test.db", "db_type": engine.DB_MYSQL}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'db name can only contain letters, numbers, and underscores.'}

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add", "db_host":"192.168.1.100", "db_type": engine.DB_MYSQL}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert 'error' not in payload

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add", "db_host":"192.168.1.100", "db_type": engine.DB_MYSQL}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'db_id add already exists.'}


    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add1", "db_type": engine.DB_PGSQL}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'postgres must set database name to connect'}

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add1", "db_name": "test", "db_type": engine.DB_PGSQL}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'must set ip addr.'}


@patch("jupyterlab_sql_explorer.handlers.engine._getDbInfo")
async def test_passwd(mock_engine, jp_fetch):
    mock_engine.return_value={'db_id': 'needpass', 'db_user': 'testuser'}
    response = await jp_fetch("jupyterlab-sql-explorer", "columns", params={'dbid': 'needpass', 'db': 'mysql', 'tbl': 'columns_priv'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': "can't get table columns of columns_priv, reason: conn not exists or error"}

    mock_engine.return_value={'db_id': 'needpass', 'db_type': engine.DB_MYSQL, 'db_user': 'testuser'}
    response = await jp_fetch("jupyterlab-sql-explorer", "columns", params={'dbid': 'needpass', 'db': 'mysql', 'tbl': 'columns_priv'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'error': 'NEED-PASS', 'pass_info': {'db_id': 'needpass', 'db_user': 'testuser'}}

    response = await jp_fetch("jupyterlab-sql-explorer", "pass", method='DELETE')
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': 'delete pass ok'}