
//https://docs.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&tabs=http
const { graphSend } = require('../src/sendMail')
const getToken = require('../src/token')

module.exports = async function (context, req) {

    var res = 'https://graph.microsoft.com'

    if (req.method =="GET") {

      var {subject,to,message} = req.query

      var payload = require('../src/schema')
      payload.message.body.content=message
      payload.message.subject=subject
      payload.message.toRecipients[0].emailAddress.address=to
  
    } else {
      var payload=req.body
    }
    console.log(JSON.stringify(payload))

    var token = await getToken(res).catch((error) =>
    {
        console.log(error)
        return context.done()
    })

      var body =await graphSend(token,`users/${req.query.from}/sendMail`,payload)
      .catch((error) => {
          console.log(error)
          return context.res = {
            status: 403,
            body:error
          };
      })
    
   return context.res = {
      status: 200, /* Defaults to 200 */
      body
    };
}