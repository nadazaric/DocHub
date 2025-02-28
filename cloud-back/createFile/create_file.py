import boto3
import json
import uuid
import base64

table_name = 'metadata-cloud-back'
bucket_name = 'files-cloud-back'
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

def create(event, context):
    body = json.loads(event['body'])
    
    if not body['isFolder']:
        save_in_s3(event)
    try:
        save_in_dynamo(event)
    except:
        if not body['isFolder']:
            delete_from_s3(body['name'])

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "message": "Successfully created doc!"
        }),
    }
    

def save_in_dynamo(event):
    body = json.loads(event['body'])
    table = dynamodb.Table(table_name)
    table.put_item(
        Item = {
            'id': str(uuid.uuid4()),
            'name' : body['name'],
            'type' : body['type'],
            'isFolder' : body['isFolder'],
            'size' : body['size'],
            'createDate' : body['createDate'],
            'lastModifyDate' : body['lastModifyDate'],
            'description' : body['description'],
            'tags' : body['tags']
        }
    )
    

def save_in_s3(event):
    body = json.loads(event['body'])
    file_bytes = decode(body)
    s3.put_object(
        Body=file_bytes,
        Bucket=bucket_name,
        Key=body['name']
    )


def delete_from_s3(name):
    s3.delete_object(Bucket=bucket_name, Key=name)


def decode(body):
    file_base64 = body['file']
    _, base64_without_header = file_base64.split(',', 1)
    base64_decoded = base64.b64decode(base64_without_header)
    return bytes(base64_decoded)