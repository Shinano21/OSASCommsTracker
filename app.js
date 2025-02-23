function doGet(e) {
  const page = e.parameter.page || 'dashboard';
  if (page === 'dashboard') {
    return HtmlService.createHtmlOutput(`<script>window.location.href = "https://shinano21.github.io/OSASCommsTracker/dashboardv2.html";</script>`);
  }
  // Redirect to GitHub Pages if not dashboard
  return HtmlService.createHtmlOutput(`<script>window.location.href = "https://shinano21.github.io/OSASCommsTracker/";</script>`);
}

function doPost(e) {
  try {
    var data = e.parameter;

    // Login validation
    if (data.username && data.password) {
      if (validateUser(data.username, data.password)) {
        return HtmlService.createHtmlOutput(`
          <script>
            window.location.href = "https://shinano21.github.io/OSASCommsTracker/dashboardv2.html";
          </script>
        `);
      } else {
        return HtmlService.createHtmlOutput(`<script>alert("Invalid username or password"); history.back();</script>`);
      }
    }
    // Forgot Password functionality
    else if (data.username) {
      var password = getPassword(data.username);
      if (password) {
        return HtmlService.createHtmlOutput(`
          <script>
            document.getElementById('passwordMessage').innerText = "HERE'S YOUR PASSWORD: ${password} MAKE SURE YOU DON'T FORGET IT! BAKA!";
            document.getElementById('resetModal').classList.add('active');
            google.script.host.close();
          </script>
        `);
      } else {
        return HtmlService.createHtmlOutput(`<script>alert("Username not found"); history.back;</script>`);
      }
    }
    // Search functionality (return JSON)
    else if (data.searchTerm && data.sheetName) {
      var results = searchData(data.searchTerm, data.sheetName);
      return ContentService.createTextOutput(JSON.stringify({
        searchResults: results,
        searchTerm: data.searchTerm,
        sheetName: data.sheetName
      })).setMimeType(ContentService.MimeType.JSON);
    }
    // Data submission logic
    else {
      if (!data.date || !data.control_number || !data.office || !data.particulars || !data.time || !data.action || !data.type) {
        return ContentService.createTextOutput("Error: Missing required fields").setMimeType(ContentService.MimeType.TEXT);
      }

      var sheetName = data.type === "incoming" ? "Incoming" : "Outgoing";
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) {
        SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
        sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (sheetName === "Incoming") {
          sheet.appendRow(['Date', 'Control Number', 'Office', 'Particulars', 'Time', 'Action']);
        } else {
          sheet.appendRow(['Date', 'Office', 'Control Number', 'Particulars', 'Time', 'Receiver']);
        }
      }

      if (sheetName === "Incoming") {
        sheet.appendRow([
          data.date,
          data.control_number,
          data.office,
          data.particulars,
          data.time,
          data.action
        ]);
      } else if (sheetName === "Outgoing") {
        sheet.appendRow([
          data.date,
          data.office,
          data.control_number,
          data.particulars,
          data.time,
          data.receiver || ''
        ]);
      }

      return HtmlService.createHtmlOutput(`
        <script>
          alert("Data submitted successfully to ${sheetName}!");
          window.location.href = "https://shinano21.github.io/OSASCommsTracker/${sheetName.toLowerCase()}.html";
        </script>
      `);
    }
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

function validateUser(username, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("User");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return true;
    }
  }
  return false;
}

function getPassword(username) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      return data[i][1];
    }
  }
  return null;
}

function searchData(searchTerm, sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getRange("A:F").getValues(); // A:F includes all columns (Date, Control Number/Office, Office/Control Number, Particulars, Time, Action/Receiver)
  const filteredData = data.filter((row, index) => {
    if (index === 0) return true; // Keep header row
    const date = row[0] ? row[0].toString().toLowerCase() : '';
    const controlNumber = sheetName === "Incoming" ? (row[1] ? row[1].toString().toLowerCase() : '') : (row[2] ? row[2].toString().toLowerCase() : '');
    const office = sheetName === "Incoming" ? (row[2] ? row[2].toString().toLowerCase() : '') : (row[1] ? row[1].toString().toLowerCase() : '');
    const particulars = row[3] ? row[3].toString().toLowerCase() : '';
    const term = searchTerm.toLowerCase();
    return (
      date.includes(term) ||
      controlNumber.includes(term) ||
      office.includes(term) ||
      particulars.includes(term)
    );
  });
  
  return filteredData;
}

function getServerTime() {
  return new Date().toLocaleString();
}