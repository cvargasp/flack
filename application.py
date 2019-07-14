import os
import time

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app, async_mode = None)

# Keep tracks of users, channels, and messages
users = []
channels = []
messages = {}

# General Channel initialization
channels.append("General")
messages["General"] = []


@app.route("/")
def index():
    """ Renders index.html page """

    return render_template("index.html", users=users, channels=channels, async_mode = socketio.async_mode)


@socketio.on("register")
def register(username):
    """ Saves username on server side """

    # Ensure if username already doesn't exists
    if username in users:
        emit("alert", "Display name already exists!")
    else:
        users.append(username)
        emit("register", username)

        # Join General channel on registration
        join_room("General")
        join_message = username + " has entered the room!"
        emit("room_change", join_message, room="General")
        data = {"channel": "General", "messages": messages["General"]}
        emit("join_channel", data)


@socketio.on("change name")
def change_name(data):
    """ Changes username on server side """

    # Ensure if username already doesn't exists
    if data["new_username"] in users:
        emit("alert", "Display name already exists!")
    else:
        # Change username in messages dictionary
        for i in messages:
            for j in range(len(messages[i])):
                if messages[i][j]["user"] == data["old_username"]:
                    messages[i][j]["user"] = data["new_username"]
        
        # Get index of old_username in users list
        index = users.index(data["old_username"])

        # Change username in users list
        users[index] = data["new_username"]

        # Emit change_name and refresh the page by joining it again
        emit("change_name", data["new_username"])
        data1 = {"channel": data["channel"], "messages": messages[data["channel"]]}
        emit("join_channel", data1)


@socketio.on("create channel")
def create_channel(channel, current_channel, username):
    """ Creates a new channel """

    # Ensure if channel already exists
    if channel in channels:
        emit("alert", "Channel already exists!")

    else:

        # Add channel name to the channel list on server side
        channels.append(channel)

        # Initialize empty message list for this channel
        messages[channel] = []
        
        if current_channel != "":
            # Remove user from previous channel
            leave_room(current_channel)
            leave_message = username + " has left the room!"
            emit("room_change", leave_message, room=current_channel)

        # Add user to this channel, announce this channel to every user
        join_room(channel)
        emit("announce channel", channel, broadcast=True)
        emit("alert", "Channel created!")
        data = {"channel": channel, "messages": messages[channel]}
        emit("join_channel", data)
        

@socketio.on("send_message")
def send_message(data):
    """ Sends a message in a channel """

	# Get time
    msg_time = time.ctime(time.time())

	# Data having username, msg, msg time
    my_data = {"user": data["user"], "msg" : data["msg"], "msg_time": msg_time}

	# Add data to the messages of the selected channel
    messages[data["channel"]].append(my_data)
	# Ensure only 100 msgs are stored per channel on server side and refresh the page by joining channel again
    if len(messages[data["channel"]]) > 100:
        messages[data["channel"]].pop(0)
        data1 = {"channel": data["channel"], "messages": messages[data["channel"]]}
        emit("join_channel", data1)

	# Emit receive message on client side
    emit("receive_message", my_data, room=data["channel"])


@socketio.on("change channel")
def change_channel(previous_channel, new_channel, user):
    """ Changes channel """

	# Remove user from previous channel
    leave_room(previous_channel)
    if previous_channel != new_channel:
        leave_message = user + " has left the room!"
        emit("room_change", leave_message, room=previous_channel)
    
	# Add user to new channel
    join_room(new_channel)
    if previous_channel != new_channel:
        join_message = user + " has entered the room!"
        emit("room_change", join_message, room=new_channel)
    data = {"channel": new_channel, "messages": messages[new_channel]}
    emit("join_channel", data)


if __name__ == "__main__":
	socketio.run(app, debug = True)