import pandas as pd
import networkx as nx
from collections import Counter
from datetime import datetime
import matplotlib.pyplot as plt

def load_data():
    """Load and prepare the graph data from CSV files."""
    events_df = pd.read_csv('data/Dark_Events.csv')
    edges_df = pd.read_csv('data/Dark_Edges.csv')
    return events_df, edges_df

def create_graph(events_df, edges_df):
    """Create a directed graph from the events and edges data."""
    G = nx.DiGraph()
    
    # Add nodes with attributes
    for _, event in events_df.iterrows():
        G.add_node(event['ID'], 
                  description=event['Description'],
                  date=event['Date'],
                  important_trigger=event['Important Trigger'],
                  death=event['Death'],
                  characters=event['Characters'],
                  world=event['World'])
    
    # Add edges with attributes
    for _, edge in edges_df.iterrows():
        if pd.notna(edge['Source']) and pd.notna(edge['Target']):
            G.add_edge(edge['Source'], edge['Target'],
                      edge_type=edge['Type'],
                      description=edge['Description'])
    
    return G

def analyze_worlds(events_df, report_file):
    """Analyze distribution of events across different worlds."""
    world_counts = events_df['World'].value_counts()
    report_file.write('\nEvents Distribution Across Worlds:\n')
    for world, count in world_counts.items():
        report_file.write(f'{world}: {count} events\n')

def analyze_temporal_patterns(events_df, report_file):
    """Analyze temporal distribution of events."""
    # Convert dates to datetime
    events_df['Date'] = pd.to_datetime(events_df['Date'], format='%d-%m-%Y')
    
    # Count events per year
    years = events_df['Date'].dt.year.value_counts().sort_index()
    report_file.write('\nTemporal Distribution of Events:\n')
    for year, count in years.items():
        report_file.write(f'Year {year}: {count} events\n')
    
    # Analyze temporal jumps
    if len(years) > 1:
        time_span = max(years.index) - min(years.index)
        report_file.write(f'\nTotal time span: {time_span} years\n')

def analyze_character_involvement(events_df, report_file):
    """Analyze character appearances and their involvement in important events."""
    all_characters = []
    for chars in events_df['Characters'].dropna():
        all_characters.extend([c.strip() for c in chars.split(',')])
    
    char_counts = Counter(all_characters)
    report_file.write('\nTop 10 Most Frequently Appearing Characters:\n')
    for char, count in char_counts.most_common(10):
        report_file.write(f'{char}: {count} appearances\n')

def analyze_important_events(events_df, report_file):
    """Analyze important trigger events and deaths."""
    trigger_count = events_df['Important Trigger'].value_counts()
    death_count = events_df['Death'].value_counts()
    
    report_file.write('\nImportant Events Analysis:\n')
    report_file.write(f'Important trigger events: {trigger_count.get(True, 0)}\n')
    report_file.write(f'Death events: {death_count.get(True, 0)}\n')

def analyze_graph_structure(G, report_file):
    """Analyze the graph structure and identify key events."""
    report_file.write('\nGraph Structure Analysis:\n')
    report_file.write(f'Number of events (nodes): {G.number_of_nodes()}\n')
    report_file.write(f'Number of connections (edges): {G.number_of_edges()}\n')
    
    # Calculate centrality measures
    in_degree = nx.in_degree_centrality(G)
    out_degree = nx.out_degree_centrality(G)
    betweenness = nx.betweenness_centrality(G)
    
    report_file.write('\nTop 5 most central events (by betweenness centrality):\n')
    top_central = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)[:5]
    for node_id, centrality in top_central:
        report_file.write(f'Event {node_id}: {centrality:.3f}\n')
    
    # Analyze dead ends (nodes with no outgoing edges)
    dead_ends = [n for n in G.nodes() if G.out_degree(n) == 0]
    report_file.write(f'\nDead-end events (no consequences): {len(dead_ends)}\n')
    
    # Analyze cycles (causal loops)
    cycles = list(nx.simple_cycles(G))
    report_file.write(f'\nCausal loops found: {len(cycles)}\n')
    if cycles:
        report_file.write('Notable causal loops:\n')
        for i, cycle in enumerate(cycles[:3], 1):
            report_file.write(f'Loop {i}: {" -> ".join(map(str, cycle))}\n')
    
    # Analyze longest paths
    longest_path = nx.dag_longest_path(G) if nx.is_directed_acyclic_graph(G) else None
    if longest_path:
        report_file.write(f'\nLongest causal chain: {len(longest_path)} events\n')
        report_file.write(f'Path: {" -> ".join(map(str, longest_path))}\n')
    
    # Analyze strongly connected components
    components = list(nx.strongly_connected_components(G))
    report_file.write(f'\nStrongly connected event groups: {len(components)}\n')
    report_file.write(f'Largest group size: {len(max(components, key=len))}\n')

def main():
    with open('report.txt', 'w') as report_file:
        report_file.write('Dark Series Graph Analysis Report\n')
        report_file.write('=' * 30 + '\n')
        
        # Load data
        events_df, edges_df = load_data()
        
        # Create graph
        G = create_graph(events_df, edges_df)
        
        # Perform various analyses
        analyze_worlds(events_df, report_file)
        analyze_temporal_patterns(events_df, report_file)
        analyze_character_involvement(events_df, report_file)
        analyze_important_events(events_df, report_file)
        analyze_graph_structure(G, report_file)

if __name__ == '__main__':
    main()