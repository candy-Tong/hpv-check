const Subscription = require('egg').Subscription;
const axios = require('axios')
const qs = require('qs');

class HpvCheckDay extends Subscription {
    // 通过 schedule 属性来设置定时任务的执行间隔等配置
    static get schedule() {
        return {
            cron: '0 0 9-23 * * *', // 每天
            type: 'worker', // 指定所有的 worker 都需要执行
        };
    }

    // subscribe 是真正定时任务执行时被运行的函数
    async subscribe() {
        this.app.logger.info('发送信息')
        let res
        try {
            const data = qs.stringify({
                'opType': '1',
                'vaccineCode': 'ff8080816e5abdb9016efe13f7fa0f6d',
                'adultId': '2d90c3477810916d017811a921fe0b94'
            });
            const config = {
                method: 'post',
                url: 'https://immunity.szcdc.net/nipisgd/getAllLocationForAduit.action?appType=2&appId=878b858f1bfd4cbfb8753226831eceaf&version=1.7.0',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': 'JSESSIONID=E974A2079A861822E2C873EFA1D29452'
                },
                data: data
            };
            res = await axios(config)
            this.app.logger.info(`查询成功\t${JSON.stringify(res.data)}`)
        } catch (e) {
            this.app.logger.info('【日常查询】查询失败')
            this.app.logger.error(e)
            await axios('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3aa08509-2fa4-4996-8b2b-586bf81f109b', {
                method: 'POST',
                data: {
                    "msgtype": "text",
                    "text": {
                        "content": `【日常查询】查询失败`
                    }
                }
            });
            return
        }
        try {
            const message_str = JSON.stringify(res.data, null, 2)
            let has_city_str
            if (message_str.includes('江门')) {
                has_city_str = '包含江门市，冲冲冲！！！！！'
            } else {
                has_city_str = '没有江门市'
            }
            const cities = res?.data?.message?.map?.(item => item.AreaName)
            await axios('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=3aa08509-2fa4-4996-8b2b-586bf81f109b', {
                method: 'POST',
                data: {
                    "msgtype": "text",
                    "text": {
                        "content": `【日常监测】${has_city_str}\n的城市数量${res?.data?.message?.length} 分别为: ${cities.join(' ')}\n响应结果为:\n${message_str}`
                    }
                }
            });
        } catch (e) {
            this.app.logger.info('发送失败')
            this.app.logger.error(e)
            return
        }
        this.app.logger.info('发送成功')
    }
}

module.exports = HpvCheckDay;
