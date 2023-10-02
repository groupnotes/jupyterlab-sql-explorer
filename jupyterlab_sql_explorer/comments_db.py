from sqlalchemy import create_engine, Column, Integer, String, Index, func, text, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

C_CONN = 1
C_SCHEMA = 2
C_TABLE = 3
C_COLUMN = 4

_conn_str=None

Base = declarative_base()

class Comments(Base):
    __tablename__ = 'comments'

    id = Column(Integer, primary_key=True)
    type = Column(Integer)
    dbid = Column(String(20))
    schema = Column(String(100))
    table = Column(String(100))
    column = Column(String(100))
    comment = Column(String(500))

    # __table_args__ = Index('type', 'dbid', 'schema', 'column')

def init(conn_str: str):
    global _conn_str
    _conn_str= conn_str
    engine = create_engine(conn_str)
    Base.metadata.create_all(engine)

def get_conn_comments():
    try:
        engine = create_engine(_conn_str)
        result = engine.execute(text('''
        SELECT `dbid`, `comment` FROM comments 
        WHERE id in ( SELECT max(id) as id FROM comments
                    WHERE `type` = :type
                    GROUP BY `dbid` )
        '''), type=str(C_CONN))
        data={}
        for r in result.fetchall():
            data[r[0]]=r[1]
        return data
    except Exception:
        return {}

def get_schema_comments(dbid: str):
    try:
        engine = create_engine(_conn_str)
        result = engine.execute(text('''
        SELECT `schema`, `comment` FROM comments
        WHERE id in ( SELECT max(id) as id FROM comments
                    WHERE `type` = :type and `dbid` = :dbid
                    GROUP BY `schema` )
        '''), type=str(C_SCHEMA), dbid=dbid)
        data={}
        for r in result.fetchall():
            data[r[0]]=r[1]
        return data
    except Exception:
        return {}

def get_table_comments(dbid: str, schema: str):
    try:
        engine = create_engine(_conn_str)
        result = engine.execute(text('''
        SELECT `table`, `comment` FROM comments 
        WHERE id in ( SELECT max(id) as id FROM comments
                    WHERE `type` = :type and `dbid` = :dbid and `schema` = :schema 
                    GROUP BY `table` )
        '''), type=str(C_TABLE), dbid=dbid, schema=schema)
        data={}
        for r in result.fetchall():
            data[r[0]]=r[1]
        return data
    except Exception:
        return {}

def get_column_comments(dbid: str, schema: str, table: str):
    try:
        engine = create_engine(_conn_str)
        result = engine.execute(text('''
        SELECT `column`, `comment` FROM comments 
        WHERE id in ( SELECT max(id) as id FROM comments
                    WHERE `type` = :type and `dbid` = :dbid and `schema` = :schema and `table` = :table
                    GROUP BY `column` )
        '''), type=str(C_COLUMN), dbid=dbid, schema=schema, table=table)
        data={}
        for r in result.fetchall():
            data[r[0]]=r[1]
        return data
    except Exception:
        return {}

def set_comments(**args):

    param={
        'type': args['type'],
        'comment': args['comment'],
        'dbid': args['dbid']
    }

    type = int(args['type'])

    if type==C_CONN:
        pass
    elif type==C_SCHEMA:
        param.update({'schema': args['schema']})
    elif type==C_TABLE:
        param.update({'schema': args['schema'], 'table': args['table']})
    elif type==C_COLUMN:
        param.update({'schema': args['schema'], 'table': args['table'], 'column': args['column']})
    else:
        raise Exception('arg error')

    engine = create_engine(_conn_str)
    Session = sessionmaker(bind=engine)
    session = Session()
    c = Comments(**param)
    session.add(c)
    session.commit()