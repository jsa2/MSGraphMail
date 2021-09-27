const {axiosClient} = require('../src/axioshelpers')

// Gets url variable for MSI Locally
var {url} = process.env

module.exports = async function (resource) {

    if (!process.env['MSI_ENDPOINT']) {

        var options = {
           url:`${url}&resource=${resource}`
        }
        
       var data = await axiosClient(options)

       return data?.data

    } else {
        var options = {
            url: `${process.env['MSI_ENDPOINT']}?resource=${resource}&api-version=2019-08-01`,
            headers:{
            "X-IDENTITY-HEADER":process.env['IDENTITY_HEADER']
            },
            method:"get"
        }
        
        console.log('msi options',options)

        var data = await(axiosClient(options)).catch((error) => {
            
            return Promise.reject(error?.data || error)
        })
    
        return data?.data
    }
    
}