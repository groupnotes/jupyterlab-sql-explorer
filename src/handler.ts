import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';
import {
  ITreeCmdRes,
  IApiRes,
  IPass,
  IQueryRes,
  IDBConn,
  IComment
} from './interfaces';

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'jupyterlab-sql-explorer', // API Namespace
    endPoint
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    // when user about, return { error }
    // FIXME: Because the ServerConnection does not handle AbortError, we have to use a hack to deal with user abort
    if (error.message === 'The user aborted a request.') {
      return { status: 'ERR', message: error.message as string } as any as T;
    }
    throw new ServerConnection.NetworkError(error);
  }

  let data: any = await response.text();
  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }

    if ('error' in data) {
      if (data.error === 'NEED-PASS') {
        data = { status: 'NEED-PASS', pass_info: data.pass_info };
      } else if (data.error === 'RETRY') {
        data = { status: 'RETRY', data: data.data };
      } else {
        data = { status: 'ERR', message: data.error };
      }
    } else {
      data = { ...data, status: 'OK' };
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

export async function GET<T>(
  act: string,
  params: { [key: string]: string },
  options?: RequestInit
): Promise<T> {
  let rc!: T;
  try {
    rc = await requestAPI<any>(
      act + '?' + new URLSearchParams(params).toString(),
      options
    );
  } catch (reason) {
    console.error(
      `The jupyterlab-sql-explorer server extension appears to be missing.\n${reason}`
    );
  }
  return rc;
}

export async function POST<T>(
  act: string,
  body: any,
  options?: RequestInit
): Promise<T> {
  let rc!: T;
  try {
    rc = await requestAPI<any>(act, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (reason) {
    console.error(
      `The jupyterlab-sql-explorer server extension appears to be missing.\n${reason}`
    );
  }
  return rc;
}

export async function DELETE<T>(
  act: string,
  params: { [key: string]: string }
): Promise<T> {
  let rc!: T;
  try {
    rc = await requestAPI<any>(
      act + '?' + new URLSearchParams(params).toString(),
      { method: 'DELETE' }
    );
  } catch (reason) {
    console.error(
      `The jupyterlab-sql-explorer server extension appears to be missing.\n${reason}`
    );
  }
  return rc;
}

export const load_db_tree = async (
  act: string,
  params: { [key: string]: string }
): Promise<ITreeCmdRes> => {
  try {
    return await GET(act, params);
  } catch (reason) {
    return { status: 'ERR', data: reason } as ITreeCmdRes;
  }
};

export const load_tree_root = async (): Promise<ITreeCmdRes> => {
  return await load_db_tree('conns', {});
};

export const load_tree_db_node = async (dbid: string): Promise<ITreeCmdRes> => {
  return await load_db_tree('dbtables', { dbid });
};

export const load_tree_table_node = async (
  dbid: string,
  db: string
): Promise<ITreeCmdRes> => {
  return await load_db_tree('dbtables', { dbid, db });
};

export const load_tree_col_node = async (
  dbid: string,
  db: string,
  tbl: string
): Promise<ITreeCmdRes> => {
  return await load_db_tree('columns', { dbid, db, tbl });
};

export const edit_conn = async (conn: IDBConn): Promise<IApiRes<any>> => {
  const newObj: { [key: string]: string } = Object.entries(conn).reduce(
    (obj, [key, value]) =>
      value !== undefined ? { ...obj, [key]: value } : obj,
    {}
  );
  return await POST('conns', newObj);
};

export const del_conn = async (dbid: string): Promise<IApiRes<any>> => {
  return await DELETE('conns', { dbid });
};

export const set_pass = async (pass_info: IPass): Promise<IApiRes<any>> => {
  const { db_id, db_user, db_pass } = pass_info;
  return await POST('pass', { db_id, db_user, db_pass });
};

export const clear_pass = async (dbid?: string): Promise<IApiRes<any>> => {
  return await DELETE('pass', { dbid: dbid || '' });
};

export const query = async (
  sql: string,
  dbid: string,
  schema?: string,
  options?: RequestInit
): Promise<IQueryRes> => {
  return await POST('query', { sql, dbid }, options);
};

export const get_query = async (
  taskid: string,
  options?: RequestInit
): Promise<IQueryRes> => {
  return await GET('query', { taskid }, options);
};

export const stop_query = async (taskid: string): Promise<IQueryRes> => {
  return await DELETE('query', { taskid });
};

export const add_comment = async (data: IComment): Promise<IApiRes<any>> => {
  return await POST('comments', data);
};
