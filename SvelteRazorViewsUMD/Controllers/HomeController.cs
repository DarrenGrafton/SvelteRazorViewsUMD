using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using SvelteRazorViews.Models;
using System.Collections.Generic;
using SvelteRazorViewsUMD.Models;

namespace SvelteRazorViews.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {

            var listItems = new List<CheckListItemModel>() 
            { 
                new CheckListItemModel(1, "dance a jig", true),
                new CheckListItemModel(2, "SVELTE!!", false),
                new CheckListItemModel(3, "start writing great Canadian novel", true),
                new CheckListItemModel(4, "be the one", false),
                new CheckListItemModel(5, "shovel the driveway", false),
                new CheckListItemModel(6, "refuel the blowtorch", true),
                new CheckListItemModel(7, "refresh this page", false),
            };


            return View(listItems);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}