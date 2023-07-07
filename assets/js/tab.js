var toggleButtons = document.querySelectorAll('.toggle-button');
var hiddenTexts = document.querySelectorAll('.hidden-text');
// Attach click event listeners to each toggle button

toggleButtons.forEach(function(button, index) {

    // Hide the hidden text initially
    hiddenTexts[index].style.display = 'none'; 
});

  
// Attach click event listeners to each toggle button
toggleButtons.forEach(function(button, index) {
  button.addEventListener('click', function() {
    var hiddenText = hiddenTexts[index];

    // Toggle the visibility of the hidden text
    if (hiddenText.style.display === 'none') {
      hiddenText.style.display = 'block';
      button.textContent = 'Show Less';
    } else {
      hiddenText.style.display = 'none';
      button.textContent = 'Show More';
    }
  });
});











