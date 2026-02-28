using DecentralizedVLab.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Добавляем SignalR
builder.Services.AddSignalR();

// Настраиваем CORS для локальной разработки (Vite обычно висит на 5173)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Обязательно для SignalR (WebSockets)
    });
});

var app = builder.Build();

app.UseCors("AllowViteFrontend");

// Мапим наш хаб на определенный URL
app.MapHub<SyncHub>("/sync-hub");

app.MapGet("/", () => "Sync Server is running. Architecture: Decentralized.");

app.Run();