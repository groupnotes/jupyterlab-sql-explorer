import pytest
import json

# @pytest.fixture
# def setup():
#     # setup before test
#     yield  # yield 之前的代码相当于 setup 部分，yield 之后的代码相当于 teardown 部分
#     # clear

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

async def test_columns(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "columns", params={'dbid': 'mysql', 'db': 'mysql', 'tbl': 'columns_priv'})
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': [{'name': 'a', 'desc': 'INT', 'type': 'col'}, {'name': 'b', 'desc': 'string', 'type': 'col'}]}

async def test_query(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "query",
                              method='POST',
                              # body=json.dumps({'dbid': 'mysql', 'sql': 'SELECT * FROM data.AAA'}))
                              body=json.dumps({'dbid': 'mysql', 'sql': 'inserxt into data.DDD values(1,2)'}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {'data': {'columns': ['type', 'name', 'tbl_name', 'rootpage', 'sql'], 'data': []}}
