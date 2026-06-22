const server = Bun.serve({
    routes: {},
    port: 3001,
});

console.log(`Server running at http://localhost:${server.port}`);
