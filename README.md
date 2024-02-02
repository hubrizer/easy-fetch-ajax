# easy-fetch-ajax
Enhanced easy-fetch script for AJAX requests using Fetch API. Handles AJAX requests with various configuration options.

I am looking to make this script better in the future. If you have any ideas, issues or need help let me know.

To demonstrate how to use the easyAjax function, let's go through a few example scenarios that cover various use cases, such as submitting a form data, making a GET request to fetch data, and uploading a file.

1. Submitting a Form Data using POST Request
   
```
   easyAjax({
    type: 'POST', // HTTP method
    url: '/submit-form', // URL where the request is sent
    container: document.querySelector('#myForm'), // Container element, usually the form itself
    data: new FormData(document.querySelector('#myForm')), // Form data to be sent
    dataType: 'json', // Expected response data type
    disableButton: true, // Disable the submit button while the request is in progress
    buttonSelector: '#submitBtn', // Selector for the submit button
    showToastrMsg: true, // Show toastr message on success or error
    success: function(response) {
        console.log('Form submitted successfully:', response);
        // Further actions on success (e.g., redirect or update UI)
    },
    error: function(error) {
        console.error('Error submitting form:', error);
        // Handle error (e.g., show error message to user)
    }
```
3. Fetching Data with GET Request
```
easyAjax({
    type: 'GET', // HTTP method
    url: '/get-data', // URL to fetch data from
    dataType: 'json', // Expected response data type
    success: function(response) {
        console.log('Data fetched successfully:', response);
        // Use the fetched data to update the UI
    },
    error: function(error) {
        console.error('Error fetching data:', error);
        // Handle error (e.g., show error message to user)
    }

});
```
3. Uploading a File
```
// Assuming there's a file input with ID 'fileInput' and a form with ID 'fileUploadForm'
const fileInput = document.querySelector('#fileInput');
const formData = new FormData();
formData.append('file', fileInput.files[0]); // Append the selected file

easyAjax({
    type: 'POST', // HTTP method
    url: '/upload-file', // URL to upload the file
    container: document.querySelector('#fileUploadForm'), // Container for the form
    data: formData, // Data containing the file to upload
    file: true, // Indicate that this request is for file upload
    dataType: 'json', // Expected response data type
    disableButton: true, // Disable the upload button while the request is in progress
    buttonSelector: '#uploadBtn', // Selector for the upload button
    showToastrMsg: true, // Show toastr message on success or error
    success: function(response) {
        console.log('File uploaded successfully:', response);
        // Further actions on success (e.g., show uploaded file)
    },
    error: function(error) {
        console.error('Error uploading file:', error);
        // Handle error (e.g., show error message to user)
    }
});
```
