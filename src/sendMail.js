const {axiosClient} = require('../src/axioshelpers')

async function graphSend (token, operation,data) {

    console.log('checking', operation)

        var options = {
            responseType: 'json',
            "method": "post",
            url:`${token.resource}/v1.0/${operation}`,
            headers:{
                'content-type':"application/json",
                authorization:"bearer " + token.access_token
            },
         data,
        }

    options
    var data = await axiosClient(options).catch((error) => {
        return Promise.reject(error?.response?.statusText)
    })

    return data?.data?.value || data?.statusText

}


  module.exports={graphSend}