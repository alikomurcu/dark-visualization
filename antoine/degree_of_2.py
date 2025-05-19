import pandas as pd

def main():
    # Load CSV files
    edges_df = pd.read_csv("data/Dark_Edges.csv")
    events_df = pd.read_csv("data/Dark_Events.csv")

    # Count incoming and outgoing edges
    incoming_counts = edges_df['Target'].value_counts()
    outgoing_counts = edges_df['Source'].value_counts()
    # print(incoming_counts)
    # print(outgoing_counts)
    # Function to check if node has exactly one incoming and one outgoing edge
    def has_degree_2(node_id):
        incoming = incoming_counts.get(node_id, 0)
        outgoing = outgoing_counts.get(node_id, 0)
        return incoming == 1 and outgoing == 1

    # Add the new column
    events_df['degree_of_2'] = events_df['ID'].apply(has_degree_2)

    # Save to a new CSV file
    events_df.to_csv("data/Dark_Events_with_degree_of_2.csv", index=False)

if __name__ == "__main__":
    main()
