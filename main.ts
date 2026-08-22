function fetchData() {
    return fetch('https://api.example.com/data')
        .then(response => response.json())
}

async function processData(data: any) {
    console.log("Processing data:", data);
}
