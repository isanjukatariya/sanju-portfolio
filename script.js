// Find all our tabs
  const tabs = document.querySelectorAll('.nav-tab');

  // Add a click listener to every tab
  tabs.forEach(tab => {
    tab.addEventListener('click', function(event) {
      event.preventDefault(); // Stops page reload
      
      // 1. Remove the 'active' class (the orange background) from ALL tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // 2. Add the 'active' class ONLY to the tab you just clicked
      this.classList.add('active');
    });
  });

  