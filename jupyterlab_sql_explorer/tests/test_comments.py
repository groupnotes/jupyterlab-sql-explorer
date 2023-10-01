from unittest.mock import patch
import os
import json
from .. import comments_db
from .. import comments

TESTDB = '/tmp/unit_test_comments.db'

# def setup_function():
#     comments_db.init("sqlite:///" + TESTDB)

# def teardown_function():
#     os.remove(TESTDB)

def test_comments_db():
    # comments_db.init("sqlite:///:memory:")
    comments_db.init("sqlite:///" + TESTDB)
    comments_db.set_comments(type=comments_db.C_CONN, dbid='con1', comment='comment of connection')
    comments_db.set_comments(type=comments_db.C_SCHEMA, dbid='con1', schema='schema1', comment='comment of schema')
    comments_db.set_comments(type=comments_db.C_TABLE, dbid='con1', schema='schema1', table='table1', comment='comment of table1')
    comments_db.set_comments(
        type=comments_db.C_COLUMN, dbid='con1', schema='schema1', table='table1', column='c1', comment='comment of c1')
    comments_db.set_comments(
        type=comments_db.C_COLUMN, dbid='con1', schema='schema1', table='table1', column='c2', comment='comment of c2')
    comments_db.set_comments(
        type=comments_db.C_COLUMN, dbid='con1', schema='schema1', table='table1', column='c1', comment='comment of c1-dup')

    c=comments_db.get_conn_comments()
    assert c == {'con1': 'comment of connection'}

    c=comments_db.get_schema_comments('con1')
    assert c == {'schema1': 'comment of schema'}

    c=comments_db.get_table_comments('con1', 'schema1')
    assert c == {'table1': 'comment of table1'}

    c=comments_db.get_column_comments('con1', 'schema1', 'table1')
    assert c == {'c1': 'comment of c1-dup', 'c2': 'comment of c2'}

@patch("jupyterlab_sql_explorer.comments_db.get_column_comments")
def test_comments(mock_get_column_comments):
    mock_get_column_comments.return_value={'c1': 'comment c1', 'c2': 'comment c2'}
    columns=[
        {'name': 'c1'},
        {'name': 'c2'},
        {'name': 'c3'},
    ]
    assert comments.match_column('con1', 'schema1', 'table1', columns)==[
        {'name': 'c1', 'desc': 'comment c1'},
        {'name': 'c2', 'desc': 'comment c2'},
        {'name': 'c3'}
    ]

@patch("jupyterlab_sql_explorer.comments_db.get_conn_comments")
def test_comments_1(mock_get_conn_comments):
    mock_get_conn_comments.return_value={'con1': 'comment con1'}
    conns=[
        {'name': 'con1'},
        {'name': 'con2'},
    ]
    assert comments.match_conn(conns)==[
        {'name': 'con1', 'desc': 'comment con1'},
        {'name': 'con2'},
    ]

@patch("jupyterlab_sql_explorer.comments_db.get_schema_comments")
def test_comments_2(mock_get_schema_comments):
    mock_get_schema_comments.return_value={'s1': 'comment s1'}
    schemas=[
        {'name': 's1'},
        {'name': 's2'},
    ]
    assert comments.match_schema('con1', schemas)==[
        {'name': 's1', 'desc': 'comment s1'},
        {'name': 's2'},
    ]

@patch("jupyterlab_sql_explorer.comments_db.get_table_comments")
def test_comments_3(mock_get_table_comments):
    mock_get_table_comments.return_value={'t1': 'comment t1'}
    tables=[
        {'name': 't1'},
        {'name': 't2'},
    ]
    assert comments.match_table('con1', 's1', tables)==[
        {'name': 't1', 'desc': 'comment t1'},
        {'name': 't2'},
    ]

async def test_comments_handler(jp_fetch):
    response = await jp_fetch("jupyterlab-sql-explorer", "comments",
        method='POST', body=json.dumps({"type": 3, "dbid": "con1", "schema": "sch1", "table": "t1", "comment": "-------"}))
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        'data': 'set comment ok'
    }