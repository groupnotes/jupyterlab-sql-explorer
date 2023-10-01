import pytest
from .. import db

def test_limit():
    sql = 'select * from aaa limit 200'
    rc, sql1 = db.set_limit(sql)
    assert sql1=='select * from aaa  LIMIT 200'

    sql = 'select * from aaa limit 200 ORDER by AAA'
    rc, sql1 = db.set_limit(sql)
    assert sql1=='select * from aaa  ORDER by AAA LIMIT 200'

    sql = 'select * from aaa'
    rc, sql1 = db.set_limit(sql)
    assert sql1=='select * from aaa LIMIT 200'

    sql = 'select * from aaa limit 20000'
    rc, sql1 = db.set_limit(sql, 200, 10000)
    assert sql1=='select * from aaa  LIMIT 10000'

    sql = 'select * from aaa limit 1000'
    rc, sql1 = db.set_limit(sql, 200, 10000)
    assert sql1=='select * from aaa  LIMIT 1000'

    sql = 'select * from aaa limit 10'
    rc, sql1 = db.set_limit(sql, 200, 10000)
    assert sql1=='select * from aaa  LIMIT 10'

    sql = '''
    Select * from (
        select * from BBB limit 10
    ) t
    '''
    rc, sql1 = db.set_limit(sql, 200, 10000)
    assert sql1=='''
    Select * from (
        select * from BBB limit 10
    ) t
     LIMIT 200'''

    sql = 'create table aaa (a int, b int)'
    rc, sql1 = db.set_limit(sql, 200, 10000)
    assert sql1=='create table aaa (a int, b int)'

    with pytest.raises(Exception):
        sql = 'select * from AAA limit x 10'
        rc, sql1 = db.set_limit(sql, 200, 10000)