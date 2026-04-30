using System.Diagnostics;
using System.Text;

namespace DecentralizedVLab.Execution;

public class CodeRunner
{
    private static readonly Dictionary<string, (string Cmd, string Args)> Commands = new()
    {
        ["python"]     = ("python3", "-u main.py"),
        ["javascript"] = ("node",    "main.js"),
        ["sqlite"]     = ("sqlite3", "-init main.sql \"\" \".quit\""),
    };

    public async Task<ExecuteResponse> RunAsync(ExecuteRequest request)
    {
        Validate(request);

        if (!Commands.TryGetValue(request.Language.ToLowerInvariant(), out var cmd))
            throw new ArgumentException($"Unsupported language: {request.Language}");

        var tempDir = Directory.CreateTempSubdirectory("vlab_");
        try
        {
            foreach (var (path, content) in request.Files)
                await File.WriteAllTextAsync(Path.Combine(tempDir.FullName, path), content);

            return await RunProcessAsync(tempDir.FullName, cmd.Cmd, cmd.Args, request.Stdin);
        }
        finally
        {
            try { tempDir.Delete(recursive: true); } catch { /* best-effort cleanup */ }
        }
    }

    private static async Task<ExecuteResponse> RunProcessAsync(
        string workDir, string cmd, string args, string? stdin)
    {
        var psi = new ProcessStartInfo(cmd, args)
        {
            WorkingDirectory = workDir,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
        };

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        using var process = new Process { StartInfo = psi };

        var sw = Stopwatch.StartNew();
        process.Start();

        // Write stdin then close — must happen before reading output to avoid deadlock
        if (!string.IsNullOrEmpty(stdin))
            await process.StandardInput.WriteAsync(stdin);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cts.Token);
        var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);

        bool timedOut = false;
        try
        {
            await process.WaitForExitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            timedOut = true;
            try { process.Kill(entireProcessTree: true); } catch { }
        }

        sw.Stop();

        var stdout = await stdoutTask.ConfigureAwait(false);
        var stderr = await stderrTask.ConfigureAwait(false);

        return new ExecuteResponse(stdout, stderr, sw.Elapsed.TotalMilliseconds, timedOut);
    }

    private static void Validate(ExecuteRequest req)
    {
        if (req.Files.Count > 20)
            throw new ArgumentException("Too many files (max 20).");

        long totalSize = req.Files.Values.Sum(v => Encoding.UTF8.GetByteCount(v));
        if (totalSize > 500 * 1024)
            throw new ArgumentException("Total file size exceeds 500 KB.");

        foreach (var path in req.Files.Keys)
        {
            if (Path.IsPathRooted(path) || path.Contains(".."))
                throw new ArgumentException($"Invalid file path: {path}");
        }
    }
}
