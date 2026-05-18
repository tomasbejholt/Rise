import pandas as pd


def load_and_clean(filepaths):
    dfs = []

    for fp in filepaths:
        df = pd.read_csv(
            fp,
            sep=";",
            skiprows=11,
            header=0,
            usecols=[2, 3, 5],
            names=["date", "temp_min", "temp_max"],
            encoding="latin1",
        )
        dfs.append(df)

    df = pd.concat(dfs, ignore_index=True)

    df["temp_mean"] = (df["temp_min"] + df["temp_max"]) / 2
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    df = df.sort_values("date").drop_duplicates(subset="date")
    df = df.dropna(subset=["temp_mean"])

    return df


def main():
    files = [
        "data/smhi-opendata_19_71380_199604_200603.csv",
        "data/smhi-opendata_19_71380_200603_201602.csv",
        "data/smhi-opendata_19_71380_201602_202601.csv",
    ]

    df = load_and_clean(files)
    df.to_csv("data/data_clean.csv", index=False)

    print("Antal rader:", len(df))
    print("Datumspann:", df["date"].min(), "→", df["date"].max())
    print("Saknade värden:", df.isna().sum().sum())


if __name__ == "__main__":
    main()
