from flask import Flask
from flask import request
from flask import jsonify
import psycopg2
import json
import os
import sys

app = Flask(__name__)
app.config['DEBUG'] = os.environ.get('DEBUG')

# Utilities
def log(msg):
    print(msg)
    sys.stdout.flush()

def write_to_db(table_name, query, data):
    connection = None

    try:
        user = os.environ.get('COLLECTOR_DB_USER')
        host = os.environ.get('COLLECTOR_DB_HOST')
        password = os.environ.get('COLLECTOR_DB_PASSWORD')
        port = os.environ.get('COLLECTOR_DB_PORT')
        database = os.environ.get('COLLECTOR_DB_DATABASE')

        connection = psycopg2.connect(user=user, host=host, password=password,
            port=port, database=database)

        cursor = connection.cursor()

        cursor.execute(query, data)
        connection.commit()
        count = cursor.rowcount

        log("%s records inserted into %s" % (count, table_name))

    except (Exception, psycopg2.Error) as error :
        log("Insert failed: %s" %(error))
    
    finally:
        if(connection):
            cursor.close()
            connection.close()
            log("Connection closed")

# HTTP handler
@app.route('/', methods=['GET'])
def index():
    return 'Alive'

@app.route('/readings', methods=['POST'])
def collect_readings():
    if request.method == 'POST':
        payload = request.json

        table_name = 'readings'
        query = "insert into " + table_name + " (client_id, sensor, readings) \
            values (%s,%s,%s)"
        client_id = payload['clientId']
        sensor = payload['sensor']
        readings = json.dumps(payload['readings'])
        data = (client_id, sensor, readings)

        write_to_db(table_name, query, data)

        return "ok"

@app.route('/consents', methods=['POST'])
def add_consent():
    if request.method == 'POST':
        payload = request.json

        table_name = 'consents'
        query = "insert into " + table_name + " (client_id, email, consent) \
            values (%s,%s,%s)"
        client_id = payload['clientId']
        email = payload['email']
        consent = payload['consent']
        data = (client_id, email, consent)

        write_to_db(table_name, query, data)

        return "ok"
