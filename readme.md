# Azure Functions  - HTTP mail service based on Graph API 

## Solution description
An implementation of Graph API  [**Send mail**](https://docs.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&tabs=http)

Creates mail service using Graph API and managed identity with api permissions
- Using permission Mail.Send on the application
- Primary Use case is to provide **centralized** simple MAIL API to clients that don't integrate directly with Graph API 

**Example use case:**
Provides REST API endpoint for function to send notifications.


___

## Disclaimer
Read [License](#license)

Not designed for bulk commercial email. Read: [Sending limits @ Exchange online](https://docs.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
![img](https://securecloud188323504.files.wordpress.com/2021/09/image-52.png)

- For commercial bulk email use, see Sendgrid etc.

___

### Examples 
#### CURL
Send email with CURL

- "From" query param needs to be an actual Exchange Online mailbox

**Simple_GET**
```bash
curl "https://fn-mailer-29375.azurewebsites.net/api/send?code=CODEHERE&from=senderaddress@anyOffice365.com&to=john.doe@example.com&message=ThisIsmessage&subject=Meetforlunch"

```
**Advanced options _POST**
- The solution also supports Graph Options for JSON payload as defined [here](https://docs.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&tabs=http#request)

- "From" url parameter needs to be an actual Exchange Online mailbox

```bash
recipient="joosua.santasalo@nixu.com"
uri="$mailSvc?code=$keys&from=sendingaccount@thx138.onmicrosoft.com"
msg="This function calling"

curl --header "Content-Type: application/json" \
--request POST \
--data "{\"message\":{\"subject\":\"Meet for lunch?\",\"body\":{\"contentType\":\"Text\",\"content\":\"$msg.\"},\"toRecipients\":[{\"emailAddress\":{\"address\":\"$recipient\"}}]},\"saveToSentItems\":\"false\"}" \
$uri
```

#### Powershell
```Powershell
  $data = @'
  {
      "message": {
        "subject": "Meet for lunch?",
        "body": {
          "contentType": "Text",
          "content": "The new cafeteria is open."
        },
        "toRecipients": [
          {
            "emailAddress": {
              "address": "johndoe@example.com"
            }
          }
        ],
      }
      "saveToSentItems": "false"
    }
  '@
$uri ="https://fn-mailer-29375.azurewebsites.net/api/send?code=CODEHERE&from=senderaddress@anyOffice365.com"
Invoke-RestMethod $uri -Method "post" -Body $data

```


## Table of contents
- [Azure Functions  - HTTP mail service based on Graph API](#azure-functions----http-mail-service-based-on-graph-api)
  - [Solution description](#solution-description)
  - [Disclaimer](#disclaimer)
    - [Examples](#examples)
      - [CURL](#curl)
      - [Powershell](#powershell)
  - [Table of contents](#table-of-contents)
  - [Hardening](#hardening)
    - [Place IP limitations on the function](#place-ip-limitations-on-the-function)
    - [Limit App Permissions](#limit-app-permissions)
  - [Prerequisites](#prerequisites)
  - [Installation script (AZ CLI)](#installation-script-az-cli)
  - [Export the AppID for hardening](#export-the-appid-for-hardening)
  - [Test the service after deployment](#test-the-service-after-deployment)
  - [License](#license)

  

## Hardening

### Place IP limitations on the function
```bash
az functionapp config access-restriction add --name $fnName \
--resource-group $rg \
--ip-address $IPRestriction \
--priority 1
```
### Limit App Permissions 
References and requirements:  [MS Docs - Configure ApplicationAccessPolicy](https://docs.microsoft.com/en-us/graph/auth-limit-mailbox-access#configure-applicationaccesspolicy)

It is recommended to set the permissions of the service principal to allow sending with only predefined accounts.
Function needs mail.send permissions, which is equivalent to typical SMTP permissions and can impersonate any user, unless hardened as per this recommendation.

- Add the functions [AppID](#export-the-appid-for-hardening) and distrubutionGroupID used for scope limitations here
- Ensure the group includes accounts you want the service can impersonate
```powershell
New-ApplicationAccessPolicy -AppId "aa2ad02d-b369-4d5e-95e6-f1391561ddce" -PolicyScopeGroupId "functionSenderAcc@thx138.onmicrosoft.com" -AccessRight RestrictAccess -Description "Restrict this app to members of distribution group EvenUsers."
```
If you see error: ``The identity of the policy scope is not a security principal`` ensure, that the group was created with  ``New-DistributionGroup`` 



## Prerequisites 

Requirement | description | Install
-|-|-
✅ Bash shell script | Tested with WSL2 (Ubuntu) on Windows 10 | [CLI script](#cli-script)
✅ [p7zip](https://www.7-zip.org/) | p7zip is  used to create the zip deployment package for package deployment | ``sudo apt-get install p7zip-full`` 
✅ AZCLI | Azure Services installation |``curl -sL https://aka.ms/InstallAzureCLIDeb \| sudo bash``
✅ Node.js runtime 14 | Used in Azure Function, and to create local function config |[install with NVM](https://github.com/nvm-sh/nvm#install--update-script)
✅ Azure Function Core Tools and VScode with Azure Functions extension  | Only needed if project is initiated locally |[Install the Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v3%2Clinux%2Ccsharp%2Cportal%2Cbash%2Ckeda#v2)


## Installation script (AZ CLI)
The CLI script below will use current subscription context to setup the solution after user has performed authentication.

Ensure you have selected a single subscription context
``` AZ LOGIN; az account set --subscription {subscriptionID} ``` 
```shell
#  https://docs.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0&tabs=http

npm install
#az login --use-device-code
#az account set --subscription 78020cde-0dd8-4ac6-a6d4-21bac00fb343
#Define starting variables
rnd=$RANDOM
fnName=fn-mailer-$rnd
rg=RG-mailer-$rnd
location=westeurope
# You can ignore the warning "command substitution: ignored null byte in input"
storageAcc=storage$(shuf -zer -n10  {a..z})

# Create Resource Group (retention tag is just example, based on another service)
az group create -n $rg \
-l $location \

# Create storageAcc Account 
saId=$(az storage account create -n $storageAcc  -g $rg --kind storageV2 -l $location -t Account --sku Standard_LRS  -o tsv --query "id")

saConstring=$(az storage account show-connection-string -g $rg  -n  $storageAcc -o tsv --query "connectionString")

## Create Function App
az functionapp create \
--functions-version 3 \
--consumption-plan-location $location \
--name $fnName \
--os-type linux \
--resource-group $rg \
--runtime node \
--assign-identity \
--storage-account $storageAcc
#
sleep 10

# Create Storage and graph Role Assignments
id=$(az functionapp  show -g $rg -n $fnName -o tsv --query "identity.principalId")

# Set to read-only, list variables here you want to be also part of cloud deployment
az functionapp config appsettings set \
--name $fnName \
--resource-group $rg \
--settings WEBSITE_RUN_FROM_PACKAGE=1 

## Create permissions for Graph
GraphAppId=00000003-0000-0000-c000-000000000000
graphspn=$(az rest --method get --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$search=\"appId:$GraphAppId\"""&\$select=displayName,id" --resource "https://graph.microsoft.com" --headers "ConsistencyLevel=eventual" -o tsv --query 'value' |cut -f3)

az rest --method post --url "https://graph.microsoft.com/v1.0/servicePrincipals/$id/appRoleAssignments" --resource "https://graph.microsoft.com" \
--body "{\"principalId\": \"$id\",\"resourceId\": \"$graphspn\",\"appRoleId\": \"b633e1c5-b582-4048-a93e-9f11b44c7e96\"}" 

#Create ZIP package 
7z a -tzip deploy.zip . -r -mx0 -xr\!*.git -xr\!*.vscode 

# Force triggers by deployment and restarts
unset mailSvc
i=0
while [ -z "$mailSvc" ] ; do
((i++))
echo "attempting to sync triggers $i/6"
az functionapp deployment source config-zip -g $rg -n $fnName --src deploy.zip
sleep 5
az functionapp restart --name $fnName --resource-group $rg 
sleep 20
keys=$(az functionapp keys list -g $rg -n $fnName -o tsv --query functionKeys) 
mailSvc=$(az functionapp function show -g $rg -n $fnName --function-name send -o tsv --query invokeUrlTemplate)
echo "looking for template $mailSvc"
echo "$mailSvc"
 if [[ $i -eq 6 ]]; then
    break  
    fi
done

#
rm deploy.zip
```

**The examples below uses variables declared in the deployment script. If you have new shell session insert the values manually**
## Export the AppID for hardening
```bash
mailFunctionAppId=$(az rest --method get --url https://graph.microsoft.com/v1.0/servicePrincipals/$id --resource "https://graph.microsoft.com" -o tsv --query "appId")
```

## Test the service after deployment
**The example below uses variables declared in the deployment script. If you have new shell session insert the values manually**
```bash

recipient="shantic@thx.dewi.red"
uri="$mailSvc?code=$keys&from=sendingaccount@thx138.onmicrosoft.com"
msg="This function calling"

curl --header "Content-Type: application/json" \
--request POST \
--data "{\"message\":{\"subject\":\"Meet for lunch?\",\"body\":{\"contentType\":\"Text\",\"content\":\"$msg.\"},\"toRecipients\":[{\"emailAddress\":{\"address\":\"$recipient\"}}]},\"saveToSentItems\":\"false\"}" \
$uri

az group delete \
--resource-group $rg 
```

## License
Copyright 2021 Joosua Santasalo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
