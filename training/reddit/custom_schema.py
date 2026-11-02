"""Dependency-free validation for user-created inference histories."""
import re

LIMITS = {'max_users': 100, 'max_periods': 11, 'max_bytes': 262144, 'max_reply_degree': 100000}


class InputError(ValueError):
    pass


def validate_input(payload, communities):
    def fail(path, message):
        raise InputError(f'{path}：{message}')

    if not isinstance(payload, dict):
        fail('数据', '最外层必须是 JSON 对象')
    if set(payload) != {'schema_version', 'period_days', 'users'}:
        fail('数据', '需要且只允许 schema_version、period_days、users 三个字段')
    if type(payload['schema_version']) is not int or payload['schema_version'] != 1:
        fail('schema_version', '请填写数字 1')
    if type(payload['period_days']) is not int or payload['period_days'] != 28:
        fail('period_days', '当前模型按 28 天一期训练，请填写数字 28')
    users = payload['users']
    if not isinstance(users, list) or not 1 <= len(users) <= LIMITS['max_users']:
        fail('users', f"需要 1–{LIMITS['max_users']} 位用户")
    names, periods = set(), None
    for i, user in enumerate(users):
        path = f'users[{i}]'
        if not isinstance(user, dict) or set(user) != {'id', 'history'}:
            fail(path, '每位用户需要且只允许 id、history 字段')
        uid = user['id']
        if not isinstance(uid, str) or not re.fullmatch(r'[A-Za-z0-9_\-\u4e00-\u9fff]{1,40}', uid):
            fail(path + '.id', '使用 1–40 个汉字、字母、数字、下划线或短横线')
        if uid in names:
            fail(path + '.id', '用户 ID 不能重复')
        names.add(uid)
        history = user['history']
        if not isinstance(history, list) or not 1 <= len(history) <= LIMITS['max_periods']:
            fail(path + '.history', f"需要 1–{LIMITS['max_periods']} 期历史，按从早到晚排列")
        if periods is None:
            periods = len(history)
        if len(history) != periods:
            fail(path + '.history', '所有用户必须有相同数量的窗口；无活动期请填写空社区和 0 度数')
        for t, record in enumerate(history):
            at = f'{path}.history[{t}]'
            if not isinstance(record, dict) or set(record) != {'communities', 'reply_degree'}:
                fail(at, '每期需要且只允许 communities、reply_degree 字段')
            cs, degree = record['communities'], record['reply_degree']
            if not isinstance(cs, list) or len(cs) > len(communities) or any(not isinstance(c, str) for c in cs):
                fail(at + '.communities', '填写支持社区名称的数组，例如 ["programming", "Python"]')
            if len(set(cs)) != len(cs):
                fail(at + '.communities', '同一期内社区名称不能重复')
            for c in cs:
                if c not in communities:
                    fail(at + '.communities', f'不支持社区“{c}”；请从页面的 44 个社区中选择，大小写须一致')
            if type(degree) is not int or not 0 <= degree <= LIMITS['max_reply_degree']:
                fail(at + '.reply_degree', f"填写 0–{LIMITS['max_reply_degree']} 的整数，不能省略")
            if not cs and degree:
                fail(at + '.reply_degree', '没有社区参与记录时，回复度数必须为 0')
    return payload


def example():
    return {'schema_version': 1, 'period_days': 28, 'users': [
        {'id': '小林', 'history': [
            {'communities': ['programming', 'Python'], 'reply_degree': 5},
            {'communities': ['programming', 'learnprogramming'], 'reply_degree': 8},
            {'communities': ['Python', 'learnprogramming'], 'reply_degree': 6}]},
        {'id': '小周', 'history': [
            {'communities': ['programming', 'linux'], 'reply_degree': 7},
            {'communities': ['programming', 'technology'], 'reply_degree': 9},
            {'communities': ['Python', 'technology'], 'reply_degree': 6}]},
        {'id': '小陈', 'history': [
            {'communities': ['gaming', 'technology'], 'reply_degree': 4},
            {'communities': ['linux', 'technology'], 'reply_degree': 6},
            {'communities': ['programming', 'linux'], 'reply_degree': 8}]},
    ]}
