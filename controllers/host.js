/**
 * Created by hxn 2017.12.09
 */
'use strict';

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(config.neo4j.uri, neo4j.auth.basic(config.neo4j.user, config.neo4j.password));

/**
 * 新增或者更新主机节点数据 返回原生neo4j的返回值。
 */
exports.add_or_update = async (ctx) => {
    try {
        var req_body = ctx.request.body
        var hostname = req_body["Hostname"]
        var uid = req_body["Uid"]
        var ips = req_body["Ips"]

        //Neo4j action:
        const session = driver.session();
        // session.close();

        var result = await searchNode(session, uid)
        // console.log(result.records.length)
        var newNode = {
            hostname: hostname,
            uid: uid,
            ips: ips
        }
        //if unexist then add ,Or do nothing.
        if (result.records.length > 0) {
            //there is a node the same as this.
            ctx.body = "there is an exist node in server."
        } else {
            var addResult = await addNode(session, newNode)
            // console.log(addResult)
            ctx.body = "add success."
        }
    } catch (e) {
        console.error(e.stack)
        ctx.status = 400;
        ctx.body = e.message
    }
}

/**
 * 搜索节点数据
 */
exports.search = async (ctx) => {
    try {
        const session = driver.session();
        var req_body = ctx.request.body
        var ips = req_body["ips"]
        console.log(ips)
        var nodes = []
        if (ips == undefined) {
            var nodes_new = await allHost(session)
            nodes = nodes.concat(nodes_new)
        } else {
            for (var i = 0; i < ips.length; i++) {
                var nodes_new = await searchByIp(session, ips[i])
                nodes = nodes.concat(nodes_new)
            }
        }
        ctx.status = 200
        ctx.body = {
            "nodes": nodes
        }
    } catch (error) {
        console.error(error.stack)
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}

/**
 * 通过中心节点和深度搜索节点数据
 */
exports.searchNodesByIdNDeepth = async (ctx) => {
    try {
        const session = driver.session();
        var req_body = ctx.request.body
        console.log(req_body)
        var identity = req_body["identity"]
        var deepth = req_body["deepth"]

        var nodes = await fetchNodesByIdNDeepth(session, identity, deepth)

        ctx.status = 200
        ctx.body = {
            "nodes": nodes
        }
    } catch (error) {
        console.error(error.stack)
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}

/**
 * 通过uid列表搜索节点数据
 */
exports.searchByUids = async (ctx) => {
    try {
        const session = driver.session();
        var req_body = ctx.request.body
        console.log(req_body)
        var uids = req_body["uids"]

        var nodes = await searchByUids(session, uids)

        ctx.status = 200
        ctx.body = {
            "nodes": nodes
        }
    } catch (error) {
        console.error(error.stack)
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}

/**
 * 共有多少个节点
 */
exports.count = async (ctx) => {
    try {
        const session = driver.session();
        var count = await nodeCount(session)

        ctx.status = 200
        ctx.body = {
            "node_count": count
        }
    } catch (error) {
        console.error(error.stack)
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}

/**
 * 更新节点的tags
 */
exports.updateTags = async (ctx) => {
    try {
        var req_body = ctx.request.body
        const session = driver.session();
        const result = await session.writeTransaction(tx => tx.run(
            'match(node) where node.uid=$uid set node.tags=$tags return count(node)', req_body))
        var records = result["records"]
        var count = records[0].toObject()['count(node)'].toString()
        ctx.status = 200
        ctx.body = {
            "node_count": count
        }
    } catch (error) {
        console.error(error.stack)
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}




/**
 * 公共方法
 * 
 * 
 * 
 * 
 */


/**
 * 查找是否已经存在这个节点
 */
async function searchNode(neo4jSession, uid) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'match(host{ uid: $uid })return host', {
            "uid": uid
        }))
    return result
}

/**
 * 新增新的节点
 */
async function addNode(neo4jSession, newNode) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'CREATE ($param)', {
            "param": newNode
        }));
    return result
}

/**
 * count
 */
async function nodeCount(neo4jSession) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'match(node) return count(node)'))
    var records = result["records"]
    var count = records[0].toObject()['count(node)'].toString()
    return count
}
/**
 * 通过IP查找一个节点
 */
async function searchByIp(neo4jSession, ip) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'match(node) where $ip in node.ips return node', {
            "ip": ip
        }))
    var records = result["records"]
    var nodes = []
    if (records.length > 0) {
        for (var i = 0; i < records.length; i++) {
            var node = records[i].toObject()["node"]
            var node_new = {
                "identity": node.identity.toString(),
                "labels": node.labels,
                "properties": node.properties
            }
            nodes.push(node_new)
        }
    }
    return nodes
}

/**
 * 通过IP查找一个节点
 */
async function searchByUids(neo4jSession, ips) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'match(node) where node.uid in $ips return node', {
            "ips": ips
        }))
    var records = result["records"]
    var nodes = []
    if (records.length > 0) {
        for (var i = 0; i < records.length; i++) {
            var node = records[i].toObject()["node"]
            var node_new = {
                "identity": node.identity.toString(),
                "labels": node.labels,
                "properties": node.properties
            }
            nodes.push(node_new)
        }
    }
    return nodes
}
/**
 * 所有节点
 */
async function allHost(neo4jSession) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'match(node) return node'))
    var records = result["records"]
    var nodes = []
    if (records.length > 0) {
        for (var i = 0; i < records.length; i++) {
            var node = records[i].toObject()["node"]
            var node_new = {
                "identity": node.identity.toString(),
                "labels": node.labels,
                "properties": node.properties
            }
            nodes.push(node_new)
        }
    }
    return nodes
}

/**
 * 通过id和深度来获取一批nodes
 */
async function fetchNodesByIdNDeepth(neo4jSession, identity, deepth) {
    var query_str = "MATCH(n)-[rel*1.." + deepth + "]-(node) \
        WHERE n.uid = $identity \
        RETURN node"
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        query_str, {
            "identity": identity,
            "deepth": deepth
        }))
    var records = result["records"]
    var nodes = []
    if (records.length > 0) {
        for (var i = 0; i < records.length; i++) {
            var node = records[i].toObject()["node"]
            // console.log(node)
            var node_new = {
                "identity": node.identity.toString(),
                "labels": node.labels,
                "properties": node.properties
            }
            nodes.push(node_new)
        }
    }
    return nodes
}