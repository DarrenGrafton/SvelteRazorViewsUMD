namespace SvelteRazorViewsUMD.Models { 

    public class CheckListItemModel
    {

        public CheckListItemModel(int id, string Description, bool Done)
        {
            Id = id;
            this.Description = Description;
            this.Done = Done;
        }


        public int Id { get; }
        public string Description { get; }
        public bool Done { get; }


    }

}
