const run_scraper = async (target_url) => {
    const url = 'https://api.apify.com/v2/acts/streamers~youtube-scraper/runs?token=apify_api_b0f1VscePLUqaYWWZpfF7ThEU4TEku4o44HJ';
    const payload = {
        startUrls: [{ url: target_url }],
        maxResults: 1
    };

    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const run = await res.json();
        console.log('Run ID:', run.data.id);

        let status = run.data.status;
        let datasetId = run.data.defaultDatasetId;

        while (status !== 'SUCCEEDED' && status !== 'FAILED') {
            await new Promise(r => setTimeout(r, 4000));
            const stUrl = `https://api.apify.com/v2/actor-runs/${run.data.id}?token=apify_api_b0f1VscePLUqaYWWZpfF7ThEU4TEku4o44HJ`;
            const stRes = await (await fetch(stUrl)).json();
            status = stRes.data.status;
            console.log('Status:', status);
        }

        if (status === 'SUCCEEDED') {
            const dataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=apify_api_b0f1VscePLUqaYWWZpfF7ThEU4TEku4o44HJ`;
            const dataRes = await (await fetch(dataUrl)).json();
            if (dataRes[0]) {
                console.log('DATA EXTRACTED:', {
                    channelId: dataRes[0].channelId,
                    externalId: dataRes[0].externalId,
                    channelUrl: dataRes[0].channelUrl,
                    totalViews: dataRes[0].channelTotalViews,
                    subs: dataRes[0].numberOfSubscribers
                });
            } else {
                console.log('DATA ARRAY IS EMPTY!');
            }
        }
    } catch (err) {
        console.error(err);
    }
};

run_scraper('https://www.youtube.com/@CanalMangaQ');
