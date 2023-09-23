import asyncio
import uuid

task_dict={}

async def create_query_task(*args):
    loop=asyncio.get_event_loop()
    future = loop.run_in_executor(None, *args)
    taskid = str(uuid.uuid4())
    task_dict[taskid] = future
    return taskid

async def get_result(taskid, timeout=118):

    if taskid not in task_dict:
        return False, {'error': 'task not exists'}

    future = task_dict[taskid]
    done, _ = await asyncio.wait({future}, timeout=timeout, return_when=asyncio.FIRST_COMPLETED)
    if future in done:
        result = future.result()
        del task_dict[taskid]
        return True, result
    else:
        return False, {'error': 'RETRY', 'data': taskid}

async def delete(taskid):
    if taskid not in task_dict:
        return False
    future = task_dict[taskid]
    future.cancel()
    del task_dict[taskid]
    return True