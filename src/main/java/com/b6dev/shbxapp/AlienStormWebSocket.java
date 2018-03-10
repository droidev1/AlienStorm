package com.b6dev.shbxapp;

import org.eclipse.jetty.websocket.api.RemoteEndpoint;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;

import java.util.List;
import java.util.ListIterator;

/**
 * Create a WebSocket that echo's back the message to all other members of the servlet.
 */
@WebSocket
public class AlienStormWebSocket {
    private volatile Session session;
    private volatile RemoteEndpoint remote;
    private List<AlienStormWebSocket> members;

    AlienStormWebSocket(List<AlienStormWebSocket> members) {
        this.members = members;
    }

    @OnWebSocketConnect
    public void onOpen(Session sess) {
        this.session = sess;
        this.remote = sess.getRemote();
        members.add(this);
    }

    @OnWebSocketMessage
    public void onMessage(String data) {
        if (data.contains("disconnect")) {
            session.close();
            return;
        }

        ListIterator<AlienStormWebSocket> iter = members.listIterator();
        while (iter.hasNext()) {
            AlienStormWebSocket member = iter.next();

            // Test if member is now disconnected
            if (!member.session.isOpen()) {
                iter.remove();
                continue;
            }

            // Async write the message back.
            member.remote.sendString(data, null);
        }
    }

    @OnWebSocketClose
    public void onClose(int code, String message) {
        members.remove(this);
    }
}
