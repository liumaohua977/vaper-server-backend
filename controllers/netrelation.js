/**
 * Created by hxn 2017.12.09
 */
'use strict';

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(config.neo4j.uri, neo4j.auth.basic(config.neo4j.user, config.neo4j.password));


/**
 * 提交网络流量关系数据。
 */
exports.add = async (ctx) => {
    try {
        var req_body = ctx.request.body
        var uid = req_body["Uid"]
        const session = driver.session()

        var NetRelations = req_body["NetRelations"]
        // console.log(ctx.request.body)
        //Neo4j action:
        // console.log(NetRelations.length)
        for (let i = 0; i < NetRelations.length; i++) {
            const relation = NetRelations[i]
            var result = await searchRelation(session, relation)
            if (result["records"].length <= 0) {
                // console.log("there is no relation")
                var res2 = await addRelation(session, relation)
                // console.log(res2)
            } else {
                // console.log("there is a relation")
            }
        } // end of for


        ctx.body = "test"
    } catch (e) {
        ctx.status = 400
        ctx.body = e.message
    }
}

/**
 * 查找一批节点的之间的关系
 */
exports.search = async (ctx) => {
    try {
        const session = driver.session()
        var req_body = ctx.request.body
        var links = await searchByUids(session, req_body["uids"])

        ctx.body = {
            "status": "success",
            "links": links
        }
    } catch (error) {
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}
/**
 * 共有多少条关系
 */
exports.count = async (ctx) => {
    try {
        const session = driver.session()
        var linksCount = await linkCount(session)
        ctx.body = {
            "status": "success",
            "linksCount": linksCount
        }
    } catch (error) {
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}
/**
 * 获取关系数据
 */
exports.fetchLinks = async (ctx) => {
    try {
        const session = driver.session()
        var links = await fetchLinks(session)
        ctx.body = {
            "status": "success",
            "links": links
        }
    } catch (error) {
        ctx.status = 400
        ctx.body = {
            "status": "error",
            "message": error.message
        }
    }
}




/**
 * todo page
 * 
 */
async function fetchLinks(neo4jSession) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'MATCH (n)-[r]-(m) RETURN r'))
    var records = result["records"]
    var links = []
    if (records.length > 0) {
        for (var i = 0; i < records.length; i++) {
            var link = records[i].toObject()["r"]
            var link = {
                "identity": link.identity.toString(),
                "source": link.start.toString(),
                "target": link.end.toString(),
                "value": 1
            }
            links.push(link)
        }
    }
    return links
}

/**
 * count
 */
async function linkCount(neo4jSession) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'MATCH (n)-[r]-(m) RETURN count(r)'))
    var records = result["records"]
    var count = records[0].toObject()['count(r)'].toString()
    return count
}

/**
 * 通过多个UID查找是否为已经存储的关系
 * @param {*} NetRelations 
 */
async function searchByUids(neo4jSession, uids) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'MATCH((anode)-[r]-(bnode))' +
        'WHERE( anode.uid in $uids and bnode.uid in $uids)' +
        'RETURN r', {
            "uids": uids
        }))
    var links = []
    if (result.records.length > 0) {
        for (var i = 0; i < result.records.length; i++) {
            var relation = result.records[i].toObject()["r"]
            var relation_new = {
                "identity": relation.identity.toString(),
                "source": relation.start.toString(),
                "target": relation.end.toString(),
                "value": 1
            }
            links.push(relation_new)
        }
    }
    return links
}

/**
 * 通过两个ip查找是否为已经存储的关系
 * @param {*} NetRelations 
 */
async function searchRelation(neo4jSession, relation) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'MATCH((anode)-[tcp]-(bnode))' +
        'WHERE($SendIp in anode.ips and $ReceiverIp in bnode.ips)' +
        'RETURN bnode', {
            "SendIp": relation["SendIp"],
            "ReceiverIp": relation["ReceiverIp"]
        }))
    return result
}

/**
 * 新建一个未存储的关系
 * @param {*} NetRelations 
 */
async function addRelation(neo4jSession, relation) {
    const result = await neo4jSession.writeTransaction(tx => tx.run(
        'MATCH(a), (b) ' +
        'where $SrcIp in a.ips and $DstIp in b.ips ' +
        'CREATE(a)-[r: tcp]->(b)' +
        'RETURN r', {
            "SrcIp": relation["SrcIp"],
            "DstIp": relation["DstIp"]
        }))
    return result
}


function getUniqIpsNetRelations(NetRelations) {
    var ips = []
    for (let i = 0; i < NetRelations.length; i++) {
        const relation = NetRelations[i]
        const SendIp = relation["SendIp"]
        if (ips.indexOf(SendIp) == -1) {
            ips.push(SendIp)
        }
        const ReceiverIp = relation["ReceiverIp"]
        if (ips.indexOf(ReceiverIp) == -1) {
            ips.push(ReceiverIp)
        }
    }
    return ips
}