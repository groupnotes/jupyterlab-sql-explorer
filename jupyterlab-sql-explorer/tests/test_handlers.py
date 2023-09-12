import json


async def test_conn(jp_fetch):

    response = await jp_fetch("jupyterlab-sql-explorer", "conns")
    assert response.code == 200
    old = json.loads(response.body)

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
        method='POST', body=json.dumps({"db_id": "add", "db_name":"default", "db_type":'6'}))
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


async def test_dbtable(jp_fetch):

    response = await jp_fetch("jupyterlab-sql-explorer", "conns",
                    method='POST',
                    body=json.dumps({"db_id": "add", "db_name":"default", "db_type":'6'}))
    assert response.code == 200

    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': 'add'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {"data": []}

    response = await jp_fetch("jupyterlab-sql-explorer", "conns", method='DELETE', params={'dbid': 'add'})
    assert response.code == 200

async def test_dbtable_tmpdb(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': 'mysql'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': [{'name': 'aaa', 'desc': '', 'type': 'table'}, {'name': 'bbb', 'desc': '', 'type': 'table'}]}

async def test_table_tmpdb(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': 'mysql', 'db': 'mysql'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': [{'name': 'aaa', 'desc': '', 'type': 'table'}, {'name': 'bbb', 'desc': '', 'type': 'table'}]}

async def test_column_tmpdb(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "columns", params={'dbid': 'mysql', 'db': 'mysql', 'tbl': 'columns_priv'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': [{'name': 'a', 'desc': 'INT', 'type': 'col'}, {'name': 'b', 'desc': 'string', 'type': 'col'}]}

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

async def test_query(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "query",
                              method='POST',
                              # body=json.dumps({'dbid': 'mysql', 'sql': 'SELECT * FROM data.AAA'}))
                              body=json.dumps({'dbid': 'mysql', 'sql': 'inserxt into data.DDD values(1,2)'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': {'columns': ['type', 'name', 'tbl_name', 'rootpage', 'sql'], 'data': []}}


async def test_fake_db(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "dbtables", params={'dbid': '__fake__'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': [{'name': 'a', 'desc': 'INT', 'type': 'col'}, {'name': 'b', 'desc': 'string', 'type': 'col'}]}