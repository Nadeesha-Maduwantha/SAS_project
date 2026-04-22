# app.py
# This is the entry point of your Flask application
# It creates the Flask app and registers all the route files

from flask import Flask
from flask_cors import CORS

# Import the blueprints (route groups) we created
from routes.templates  import templates_bp
from routes.milestones import milestones_bp
from routes.shipments import shipments_bp

# Flask(__name__) creates the app
# __name__ is a Python built-in that holds the name of the current file
app = Flask(__name__)

# CORS = Cross Origin Resource Sharing
# Without this, your browser will BLOCK Next.js from calling Flask
# because they run on different ports (3000 vs 5000)
# This one line fixes that
CORS(app)

# Register blueprints — this tells Flask "these routes exist"
# url_prefix means all routes in templates_bp start with nothing extra
# (the routes themselves already have /api/... in them)
app.register_blueprint(templates_bp)
app.register_blueprint(milestones_bp)
app.register_blueprint(shipments_bp)


# Health check route — useful to test if Flask is running
@app.route('/')
def health():
    return {"status": "Flask is running"}, 200

@app.route('/template/assign/<shipmentID>')
def assignTemplate(shipmentID):
    #should show the assigning templates 
    return("Shipment assigned")


@app.route('/milestone/checkCurrent/<shipmentID>/<previousMilestoneStatus>')
def checkCurrent(shipmentID,previousMilstoneStstus):
    #should have the code to check the current milestone and itd status
    return()
    
# This block only runs when you execute app.py directly
# debug=True means Flask auto-restarts when you save a file

if __name__ == '__main__':
    app.run(debug=True, port=5000)