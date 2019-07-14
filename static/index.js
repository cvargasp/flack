document.addEventListener('DOMContentLoaded', () => {

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Get user's local storage
    var storage = window.localStorage;

    // Greet user if exists
    if (storage.getItem("username"))
    {
        document.querySelector('#display_username').innerHTML = "Welcome, " + storage.getItem('username');
    }
    //storage.removeItem("username");
    //storage.removeItem("channel");

    
    function change_channel_function()
    {
        /* Change channel funcion */

        // Each button having class btn-link should emit a "change channel" event
        document.querySelectorAll('button.btn-link').forEach(button => {
            button.onclick = () => {
                var channel = button.dataset.channel;
                socket.emit('change channel', storage.getItem('channel'), channel, storage.getItem('username'));
            };
        });

    }


    socket.on('connect', () => {
        /* Connect socket */

        // Ensure user is added
        if (!storage.getItem("username"))
        {
            $("#registerModal").modal({backdrop: 'static', keyboard: false});
            document.querySelector("#display").style.display = "none";
        }

        // Join a channel if a user was in that particular channel before leaving
        if (storage.getItem('channel')) {
            socket.emit("change channel", storage.getItem('channel'), storage.getItem('channel'), storage.getItem('username'));
        }
        // Else hide the chat section
        else {
            document.querySelector("#chat").style.display = "none";
        }

        // Initialize every channel button's onclick event
        change_channel_function();

    });


    document.querySelector("#register_form").onsubmit = () => {
        /* Execute on submitting register_form */

        // Get username field
        const username = document.querySelector("#username");

        // Ensure username is not less than 4 characters
        if (username.value.length < 4)
        {
            alert("Display name must be at least 4 characters long!");
            username.focus();
            return false;
        }

        // Register
        socket.emit("register", username.value);

        // Prevent form submission
        return false;

    };


    document.querySelector("#change_name_form").onsubmit = () => {
        /* Execute on submitting change_name_form */

        // Get new username field
        new_username = document.querySelector("#new_username");

        // Get current username from storage
        username = storage.getItem("username");

        // Ensure username is not less than 4 characters
        if (new_username.value.length < 4)
        {
            alert("Display name must be at least 4 characters long!");
            new_username.focus();
            return false;
        }

        // Ensure new username is different than current username
        if (new_username.value == username)
        {
            alert("New display name must be different!");
            new_username.focus();
            return false;
        }

        data = {"old_username": username, "new_username": new_username.value, "channel": storage.getItem("channel")};

        // Change username
        socket.emit("change name", data);

        // Prevent form submission
        return false;

    };


    socket.on('register', username => {
        /* Announce new channel for everyone */

        // Save username in local storage for future use
        storage.setItem("username", username);

        // Greet user
        document.querySelector('#display_username').innerHTML = "Welcome, " + storage.getItem('username');

        // Hide register modal once registered and display everything else
        $("#registerModal").modal('hide');
        document.querySelector("#display").style.display = "block";

        // Focus on channel name field
        document.querySelector("#channel").focus();

        // Display alert message
        alert("Registered!")
        
    });


    socket.on('change_name', username => {
        /* Announce new channel for everyone */

        // Save the changed username in local storage for future use
        storage.removeItem("username");
        storage.setItem("username", username);

        // Greet user
        document.querySelector('#display_username').innerHTML = "Welcome, " + storage.getItem('username');

        // Hide change modal once registered and display everything else
        $("#change_name_modal").modal('hide');

        // Remove typed display name from the field
        document.querySelector("#new_username").value = "";

        // Display alert message
        alert("Changed!")
        
    });

    
    document.querySelector("#create_channel_form").onsubmit = () => {
        /* Execute on submitting create_channel_form */

        // Get channel name field
        const channel = document.querySelector("#channel");

        // Ensure channel name is not less than 3 characters
        if (channel.value.length < 3)
        {
            alert("Channel name must be at least 3 characters long");
            channel.focus();
            return false;
        }
        
        current_channel = "";
        // Get current channel (if exists) and username
        current_channel = storage.getItem("channel");
        username = storage.getItem("username");

        // Emit create channel
        socket.emit("create channel", channel.value, current_channel, username);

        // Delete channel name from textbox
        channel.value = "";
        
        // Prevent form submission
        return false;

    };

    
    socket.on('announce channel', channel => {
        /* Announce new channel for everyone */

        // Create a channel button inside a div
        const div = document.createElement('div');
        div.innerHTML = `<button class="btn btn-link" data-channel="${ channel }">${ channel }</button>`;
        document.querySelector('#channels').append(div);

        // Focus on message field
        document.querySelector("#message").focus();

        // Initialize onclick event of channels
        change_channel_function();
        
    });


    socket.on('alert', message => {
        /* Alert message to be displayed */

        alert(message);

    });

    
    socket.on('join_channel', data => {
        /* Execute when user joins a channel */

        // Save channel in storage
        storage.setItem('channel', data["channel"]);

        // Clear messages area
        document.querySelector("#messages").innerHTML = "";

        // Display channel name at header
        document.querySelector("#channel_name").innerHTML = data["channel"];

        // Display chat section
        document.querySelector("#chat").style.display = "block";

        // Fill up messages area with the selected channel's messages
        var x;
        for (x in data["messages"]) {
            const div = document.createElement('div');
            if (data["messages"][x].user == storage.getItem("username"))
            {
                div.innerHTML = `<div class="jumbotron jumbotron4"><strong style="font-family: sans-serif;">${data["messages"][x].user}:</strong><div>${data["messages"][x].msg}</div><small>(${data["messages"][x].msg_time})</small></div>`;
            }
            else
            {
                div.innerHTML = `<div class="jumbotron jumbotron5"><strong style="font-family: sans-serif;">${data["messages"][x].user}:</strong><div>${data["messages"][x].msg}</div><small>(${data["messages"][x].msg_time})</small></div>`;
            }
            document.querySelector("#messages").append(div);
        }
        
    });


    
    document.querySelector("#send_message_form").onsubmit = () => {
        /* Execute on submitting send_message_form */

        // Get the msg field
        msg = document.querySelector("#message");

        // Ensure msg is typed (and not only spaces)
        if (msg.value.trim().length == 0)
        {
            alert("Type a message first!");
            msg.focus();
            return false;
        }

        // Get username, channel name
        user = storage.getItem('username');
        channel = storage.getItem('channel');

        // Data having msg, username, and channel name
        data = {'msg': msg.value, 'user': user, 'channel': channel};

        // Emit send message
        socket.emit('send_message', data);

        // Remove msg from text field
        document.querySelector("#message").value = '';

        // Set focus to message field
        document.querySelector("#message").focus();
        
        // Prevent form submission
        return false;

    };


    
    socket.on('receive_message', data => {
        /* Execute when a message is sent */

        // Show message for all users on the channel
        const div = document.createElement('div');
        if (data.user == storage.getItem("username"))
        {
            div.innerHTML = `<div class="jumbotron jumbotron4"><strong style="font-family: sans-serif;">${data.user}:</strong><div>${data.msg}</div><small>(${data.msg_time})</small></div>`;
        }
        else
        {
            div.innerHTML = `<div class="jumbotron jumbotron5"><strong style="font-family: sans-serif;">${data.user}:</strong><div>${data.msg}</div><small>(${data.msg_time})</small></div>`;
        }
        document.querySelector("#messages").append(div);

    });


    socket.on('room_change', message => {
        /* Announce new channel for everyone */

        const div = document.createElement('div');
        div.innerHTML = `<div class="jumbotron jumbotron6"><strong>${message}</strong></div>`;
        document.querySelector("#messages").append(div);
        
    });


});