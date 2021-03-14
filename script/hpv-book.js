const axios = require('axios')
const qs = require('qs')

const vaccineCode = 'ff8080816e5abdb9016efe13f7fa0f6d'  // 九价疫苗代码
// const vaccineCode = '2d90c38f7235a22c017235e08aff002c'  // 二价疫苗代码，一定要注释掉！！！！！！！！！！！！！！！！
const areaCode = '44070300' // 蓬江区
const people = {
    'idCard': '440781199707106220',
    'Phone': '13422751521',
    'name': '赵洁玲',
}

// 查询有九价疫苗的地区
async function getArea() {
    const data = qs.stringify({
        'opType': '1',
        vaccineCode,  // 九价疫苗代码
        'adultId': '2d90c3477810916d017811a921fe0b94'
    });

    let res = await axios({
        method: 'post',
        url: 'https://immunity.szcdc.net/nipisgd/getAllLocationForAduit.action?appType=2&appId=878b858f1bfd4cbfb8753226831eceaf&version=1.7.0',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data
    });
    return res.data.message
}

// 查询某地区的医院
async function getHospital(areaCode) {
    const data = qs.stringify({
        areaCode, // 蓬江区
        'opType': 'queryVaccOrg',
        vaccineCode,  // 九价疫苗代码
        'adultId': '2d90c3477810916d017811a921fe0b94'
    });
    const config = {
        method: 'post',
        url: 'https://immunity.szcdc.net/nipisgd/appApintrment.action?appType=2&appId=878b858f1bfd4cbfb8753226831eceaf&version=1.7.0',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    };

    const res = await axios(config)
    return res.data.message

}

/**
 * 查看疫苗可预订日期
 * @param orgCode 具体的医院代码
 * @return {Promise<*>}
 */
async function getBookDate(orgCode) {
    const data = qs.stringify({
        orgCode,
        'opType': 'vaccDate',
        vaccineCode,
        'adultId': '2d90c3477810916d017811a921fe0b94'
    });
    const config = {
        method: 'post',
        url: 'https://immunity.szcdc.net/nipisgd/appApintrment.action?appType=2&appId=878b858f1bfd4cbfb8753226831eceaf&version=1.7.0',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        data: data
    };

    const res = await axios(config)
    return res.data.message
}

/**
 * 预约疫苗
 * @param orgCode 具体的医院代码
 * @param apptrmentCode 日期代码
 * @param segmentId 上午/下午的代码
 * @return {Promise<*>}
 */
async function book(orgCode, apptrmentCode, segmentId) {
    const data = qs.stringify({
        ...people,
        'adultId': '2d90c3477810916d017811a921fe0b94',
        orgCode,
        vaccineCode,
        apptrmentCode,
        segmentId,
        'opType': 'register'
    });
    const config = {
        method: 'post',
        url: 'https://immunity.szcdc.net/nipisgd/appApintrment.action?appType=2&appId=878b858f1bfd4cbfb8753226831eceaf&version=1.7.0',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        data: data
    };

    const res = await axios(config)
    return res.data.message
}

async function start() {

    console.log('---------------\nstart time', new Date().toLocaleString())
    // 查询江门是否有疫苗

    let area = await getArea()
    let areaList = area.map(item => item.AreaName)
    console.log('---------------\n', areaList.join(' '))
    if (!areaList.join(' ').includes('江门')) {
        console.log('---------------\n没有江门市疫苗')
        return
    }
    console.log('---------------\n有江门市疫苗')

    // 查询蓬江区是否有疫苗
    const hospitalsList = await getHospital(areaCode)
    console.log('---------------\n查询蓬江区是否有疫苗', hospitalsList)
    // 抢第一家医院
    const hospital = hospitalsList[0]

    if(!hospital){
        console.log('查询蓬江区的医院没有疫苗')
        return
    }
    // 第一家医院可预订日期
    const bookDateList = await getBookDate(hospital.orgCode)

    // const bookDateList = [
    //     {
    //         apptrmentCode: '4407030203202103091708037766',
    //         vaccDate: '2021-03-12',
    //         list: '[{"apptrmentCode":"4407030203202103091708037766","timeNo":1,"isCloseLb":"","segmentId":"2d90c30d7812bbc40178163e48d12640","startTime":"08:00","endTime":"10:00","linkBtnDesc":"剩余:10"}]'
    //     }
    // ]
    console.log('---------------\n第一家医院可预订日期', bookDateList)
    // 获取剩余大于0的日期
    const bookDate = bookDateList.find(item => {
        let list = JSON.parse(item.list)
        return list.find(listItem => {
            return !listItem.linkBtnDesc.includes('剩余:0')
        })
    })
    if (!bookDate) {
        console.log('---------------\n该医院找不到有剩余的日期')
        return
    }
    const bookTimeObj = JSON.parse(bookDate.list).find(listItem => {
        return !listItem.linkBtnDesc.includes('剩余:0')
    })
    const timeStr = bookTimeObj.startTime < '12:00' ? '上午' : '下午'
    console.log(`---------------\n${bookDate.vaccDate} ${timeStr} 可以预定`)


    let res = await book(hospital.orgCode, bookTimeObj.apptrmentCode, bookTimeObj.segmentId)
    console.log(res)

    await axios('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3aa08509-2fa4-4996-8b2b-586bf81f109b', {
        method: 'POST',
        data: {
            "msgtype": "text",
            "text": {
                "content": `预订成功，请检查\n${bookDate.vaccDate} ${timeStr} 可以预定`
            }
        }
    });

}

start()




