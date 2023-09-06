export interface IDbItem {
    type : string,
    name : string,
    subtype?: string,
    desc ?: string,
    next ?: IDbItem[] | false
}

export interface IDBConn {
    db_id: string,
    db_type: string,
    db_name?: string,
    db_host?: string,
    db_port?: string,
    db_user?: string,
    db_pass?: string,
    name?: string
}

export interface IPass {
    db_id: string,
    db_user: string,
    db_pass: string
}

export type TApiStatus = 'OK' | 'NEED-PASS' | 'ERR'

export interface IApiRes<T> {
    status: TApiStatus,
    pass_info?: IPass  // if status if NEED_PASS,
    message?: string,
    data?: T
}

export interface ITreeCmdRes {
    status: TApiStatus,
    message?: string,
    data?: Array<IDbItem>,
    pass_info?: IPass  // if status if NEED_PASS,
}

export interface IQueryRes {
    status: TApiStatus,
    data: {
        columns : Array<string>,
        data : Array<Array<any>>
    }
    message?: string,
    pass_info?: IPass  // if status if NEED_PASS,
}