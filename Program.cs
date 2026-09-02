using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UCCW.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDefaultIdentity<IdentityUser>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login";
    options.AccessDeniedPath = "/Account/AccessDenied";
    options.Cookie.Name = "UCCW.Auth";
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;
});

builder.Services.AddRazorPages(options =>
{
    options.Conventions.AuthorizeFolder("/");
    options.Conventions.AllowAnonymousToPage("/Account/Login");
    options.Conventions.AllowAnonymousToPage("/Error");
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    await context.Database.EnsureCreatedAsync();

    var users = services.GetRequiredService<UserManager<IdentityUser>>();
    var administratorEmail = builder.Configuration["InitialAdmin:Email"];
    var administratorPassword = builder.Configuration["InitialAdmin:Password"];
    if (!string.IsNullOrWhiteSpace(administratorEmail) &&
        !string.IsNullOrWhiteSpace(administratorPassword) &&
        await users.FindByEmailAsync(administratorEmail) is null)
    {
        var administrator = new IdentityUser
        {
            UserName = administratorEmail,
            Email = administratorEmail,
            EmailConfirmed = true
        };
        var result = await users.CreateAsync(administrator, administratorPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException("No se pudo crear el usuario administrador inicial.");
    }
}

app.MapRazorPages();
app.Run();
