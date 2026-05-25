import os
import requests
import json
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY")

def search_google_scholar(query: str, limit: int = 5) -> list:
    if not SERPAPI_KEY:
        return []
    
    try:
        url = "https://serpapi.com/search.json"
        params = {
            "engine": "google_scholar",
            "q": query,
            "api_key": SERPAPI_KEY,
            "num": limit
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for item in data.get("organic_results", []):
            results.append({
                "title": item.get("title", "No Title"),
                "authors": [a.get("name") for a in item.get("publication_info", {}).get("authors", [])],
                "abstract": item.get("snippet", "No abstract available"),
                "url": item.get("link", ""),
                "doi": None,
                "year": None,
                "citation_count": item.get("inline_links", {}).get("cited_by", {}).get("total", 0),
                "source_platform": "Google Scholar",
                "pdf_url": item.get("resources", [{}])[0].get("link") if item.get("resources") else None,
            })
        return results
    except Exception as e:
        print(f"Google Scholar search failed: {e}")
        return []

def search_semantic_scholar(query: str, limit: int = 5) -> list:
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": limit,
            "fields": "title,authors,abstract,url,year,citationCount,externalIds"
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for item in data.get("data", []):
            results.append({
                "title": item.get("title", "No Title"),
                "authors": [a.get("name") for a in item.get("authors", [])],
                "abstract": item.get("abstract") or "No abstract available",
                "url": item.get("url", ""),
                "doi": item.get("externalIds", {}).get("DOI"),
                "year": item.get("year"),
                "citation_count": item.get("citationCount", 0),
                "source_platform": "Semantic Scholar",
                "pdf_url": None,
            })
        return results
    except Exception as e:
        print(f"Semantic Scholar search failed: {e}")
        return []

def search_arxiv(query: str, limit: int = 5) -> list:
    try:
        url = "http://export.arxiv.org/api/query"
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": limit
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        root = ET.fromstring(response.text)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        results = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns).text.replace('\n', ' ').strip()
            abstract = entry.find('atom:summary', ns).text.replace('\n', ' ').strip()
            url_link = entry.find('atom:id', ns).text
            
            pdf_url = None
            for link in entry.findall('atom:link', ns):
                if link.attrib.get('title') == 'pdf':
                    pdf_url = link.attrib.get('href')
            
            authors = [author.find('atom:name', ns).text for author in entry.findall('atom:author', ns)]
            published = entry.find('atom:published', ns).text
            year = int(published[:4]) if published else None
            
            results.append({
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "url": url_link,
                "doi": None,
                "year": year,
                "citation_count": 0,
                "source_platform": "arXiv",
                "pdf_url": pdf_url,
            })
        return results
    except Exception as e:
        print(f"arXiv search failed: {e}")
        return []

def search_pubmed(query: str, limit: int = 5) -> list:
    try:
        search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmode": "json",
            "retmax": limit
        }
        search_res = requests.get(search_url, params=search_params, timeout=10)
        search_res.raise_for_status()
        id_list = search_res.json().get("esearchresult", {}).get("idlist", [])
        
        if not id_list:
            return []
            
        summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        summary_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "json"
        }
        summary_res = requests.get(summary_url, params=summary_params, timeout=10)
        summary_res.raise_for_status()
        summary_data = summary_res.json().get("result", {})
        
        results = []
        for pmid in id_list:
            item = summary_data.get(pmid, {})
            if not item or "error" in item:
                continue
                
            authors = [a.get("name") for a in item.get("authors", [])]
            
            doi = None
            for article_id in item.get("articleids", []):
                if article_id.get("idtype") == "doi":
                    doi = article_id.get("value")
                    
            pub_date = item.get("pubdate", "")
            year = int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else None
            
            results.append({
                "title": item.get("title", "No Title"),
                "authors": authors,
                "abstract": "Abstract available on PubMed", 
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "doi": doi,
                "year": year,
                "citation_count": 0,
                "source_platform": "PubMed",
                "pdf_url": None,
            })
        return results
    except Exception as e:
        print(f"PubMed search failed: {e}")
        return []

def search_crossref(query: str, limit: int = 5) -> list:
    try:
        url = "https://api.crossref.org/works"
        params = {
            "query": query,
            "rows": limit,
            "select": "title,author,abstract,URL,DOI,published-print,published-online,is-referenced-by-count"
        }
        
        crossref_email = os.getenv("CROSSREF_EMAIL")
        if crossref_email:
            params["mailto"] = crossref_email
            
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for item in data.get("message", {}).get("items", []):
            title = item.get("title", ["No Title"])[0] if item.get("title") else "No Title"
            
            authors = []
            for a in item.get("author", []):
                if "given" in a and "family" in a:
                    authors.append(f"{a['given']} {a['family']}")
                elif "family" in a:
                    authors.append(a["family"])
                    
            abstract = item.get("abstract", "No abstract available")
            if abstract.startswith("<jats"):
                import re
                abstract = re.sub(r'<[^>]+>', '', abstract)
                
            published = item.get("published-print") or item.get("published-online")
            year = None
            if published and "date-parts" in published and published["date-parts"]:
                year = published["date-parts"][0][0]
                
            results.append({
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "url": item.get("URL", ""),
                "doi": item.get("DOI"),
                "year": year,
                "citation_count": item.get("is-referenced-by-count", 0),
                "source_platform": "CrossRef",
                "pdf_url": None,
            })
        return results
    except Exception as e:
        print(f"CrossRef search failed: {e}")
        return []

def search_ieee(query: str, limit: int = 5) -> list:
    """
    Search IEEE Xplore (mock/fallback using CrossRef filtered for IEEE).
    """
    try:
        url = "https://api.crossref.org/works"
        params = {
            "query": f"{query} IEEE",
            "rows": limit,
            "select": "title,author,abstract,URL,DOI,published-print,published-online,is-referenced-by-count,publisher"
        }
        
        crossref_email = os.getenv("CROSSREF_EMAIL")
        if crossref_email:
            params["mailto"] = crossref_email
            
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for item in data.get("message", {}).get("items", []):
            publisher = item.get("publisher", "").lower()
            if "ieee" not in publisher and "institute of electrical and electronics engineers" not in publisher:
                continue
                
            title = item.get("title", ["No Title"])[0] if item.get("title") else "No Title"
            
            authors = []
            for a in item.get("author", []):
                if "given" in a and "family" in a:
                    authors.append(f"{a['given']} {a['family']}")
                elif "family" in a:
                    authors.append(a["family"])
                    
            abstract = item.get("abstract", "No abstract available")
            if abstract.startswith("<jats"):
                import re
                abstract = re.sub(r'<[^>]+>', '', abstract)
                
            published = item.get("published-print") or item.get("published-online")
            year = None
            if published and "date-parts" in published and published["date-parts"]:
                year = published["date-parts"][0][0]
                
            results.append({
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "url": item.get("URL", ""),
                "doi": item.get("DOI"),
                "year": year,
                "citation_count": item.get("is-referenced-by-count", 0),
                "source_platform": "IEEE Xplore (via CrossRef)",
                "pdf_url": None,
            })
        return results
    except Exception as e:
        print(f"IEEE search failed: {e}")
        return []

def search_all_academic(query: str, limit_per_source: int = 3) -> list:
    """
    Query all available academic sources in parallel and merge results.
    """
    search_functions = [
        search_semantic_scholar,
        search_arxiv,
        search_pubmed,
        search_crossref,
        search_ieee
    ]
    
    if SERPAPI_KEY:
        search_functions.append(search_google_scholar)
        
    all_results = []
    
    with ThreadPoolExecutor(max_workers=len(search_functions)) as executor:
        future_to_search = {executor.submit(func, query, limit_per_source): func.__name__ for func in search_functions}
        for future in as_completed(future_to_search):
            try:
                results = future.result()
                all_results.extend(results)
            except Exception as e:
                func_name = future_to_search[future]
                print(f"{func_name} generated an exception: {e}")
                
    deduped = []
    seen_titles = set()
    seen_dois = set()
    
    all_results.sort(key=lambda x: x.get('citation_count') or 0, reverse=True)
    
    for item in all_results:
        doi = item.get('doi')
        if doi and doi.lower() in seen_dois:
            continue
            
        title = item.get('title', '').lower().strip()
        if title and title in seen_titles:
            continue
            
        if doi:
            seen_dois.add(doi.lower())
        if title:
            seen_titles.add(title)
            
        deduped.append(item)
        
    return sorted(deduped, key=lambda x: x.get('citation_count') or 0, reverse=True)
