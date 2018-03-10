package com.b6dev.shbxapp;

import org.eclipse.jetty.websocket.servlet.*;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@SuppressWarnings("serial")
public class AlienStormServlet extends WebSocketServlet implements WebSocketCreator {
    /**
     * Holds active sockets to other members of the chat
     */
    private final List<AlienStormWebSocket> members = new CopyOnWriteArrayList<>();

    @Override
    public void configure(WebSocketServletFactory factory) {
        factory.setCreator(this);
    }

    @Override
    public Object createWebSocket(ServletUpgradeRequest req, ServletUpgradeResponse resp) {
        if (req.hasSubProtocol("astorm")) {
            resp.setAcceptedSubProtocol("astorm");
            return new AlienStormWebSocket(members);
        }
        return null;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        getServletContext().getNamedDispatcher("default").forward(request, response);
    }

}
